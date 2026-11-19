import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import tls from 'node:tls';
import { resolve } from 'node:path';

import { webUiPathWrapper } from '@/napcat-webui-backend/index';
import { WebUiDataRuntime } from '@/napcat-webui-backend/src/helper/Data';
import { buildAlertMail, type MailKind, type MailVars } from '@/napcat-webui-backend/src/helper/MailTemplates';

export interface MailConfig {
  enable: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  notifyOffline: boolean;
  notifyRecover: boolean;
  /** 已废弃：看门狗不再用冷却窗口压制提醒，保留字段只为兼容旧配置文件 */
  cooldownMinutes?: number;
}

const DEFAULT_CONFIG: MailConfig = {
  enable: false,
  host: '',
  port: 465,
  secure: true,
  user: '',
  pass: '',
  from: '',
  to: '',
  notifyOffline: true,
  notifyRecover: true,
};

function configFile (): string {
  return resolve(webUiPathWrapper.configPath, './mail.json');
}

function stateFile (): string {
  return resolve(webUiPathWrapper.configPath, './mail_state.json');
}

export function getMailConfig (): MailConfig {
  try {
    const raw = fs.readFileSync(configFile(), 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveMailConfig (patch: Partial<MailConfig>): MailConfig {
  const cfg: MailConfig = { ...getMailConfig(), ...patch };
  try {
    fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 4));
  } catch (e) {
    throw new Error(`保存邮件配置失败: ${(e as Error).message}`);
  }
  return cfg;
}

export function isMailReady (cfg: MailConfig = getMailConfig ()): boolean {
  return !!(cfg.host && cfg.user && cfg.pass);
}

/** 最后一次观察到的登录状态，落盘保存，进程重启不会丢掉「之前是在线还是离线」 */
interface MailState {
  online: boolean;
  at: number;
}

function loadMailState (): MailState | null {
  try {
    const raw = fs.readFileSync(stateFile(), 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data?.online !== 'boolean') return null;
    return { online: data.online, at: Number(data.at) || 0 };
  } catch {
    return null;
  }
}

function saveMailState (state: MailState): void {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state, null, 4));
  } catch (e) {
    console.log(`[SHCAP] 保存邮件告警状态失败: ${(e as Error).message}`);
  }
}

function firstLanIp (): string {
  try {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const item of list || []) {
        if (item.family === 'IPv4' && !item.internal) return item.address;
      }
    }
  } catch { /* ignore */ }
  return '';
}

function webUiPort (): number {
  try {
    const raw = JSON.parse(fs.readFileSync(resolve(webUiPathWrapper.configPath, './webui.json'), 'utf-8'));
    const port = Number(raw?.port);
    if (port > 0) return port;
  } catch { /* ignore */ }
  return 6099;
}

/** 面板地址：可用环境变量 SHCAP_PANEL_URL 覆盖，默认取本机内网 IP + WebUI 端口 */
function panelUrl (): string {
  const envUrl = process.env.SHCAP_PANEL_URL;
  if (envUrl) return envUrl;
  const ip = firstLanIp() || '127.0.0.1';
  return `https://${ip}:${webUiPort()}`;
}

function alertVars (cfg: MailConfig): MailVars {
  const info = (() => {
    try {
      return WebUiDataRuntime.getQQLoginInfo();
    } catch {
      return null;
    }
  })();
  let uin = '';
  try {
    uin = String(WebUiDataRuntime.getQQLoginUin() || '');
  } catch { /* ignore */ }
  return {
    time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }),
    uin,
    nick: info?.nick || '',
    panel: panelUrl(),
    host: firstLanIp() || '127.0.0.1',
    mailFrom: cfg.from || cfg.user,
    mailTo: cfg.to,
  };
}

interface SmtpReply {
  code: number;
  text: string;
}

class SmtpClient {
  private buffer = '';
  private waiters: Array<(line: string) => void> = [];
  private socket: net.Socket;

  constructor (socket: net.Socket) {
    this.socket = socket;
    socket.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      this.flush();
    });
  }

  private flush (): void {
    while (this.waiters.length > 0) {
      const idx = this.buffer.indexOf('\n');
      if (idx < 0) break;
      const line = this.buffer.slice(0, idx + 1);
      this.buffer = this.buffer.slice(idx + 1);
      const waiter = this.waiters.shift();
      waiter?.(line);
    }
  }

  readLine (): Promise<string> {
    return new Promise((resolveLine) => {
      const idx = this.buffer.indexOf('\n');
      if (idx >= 0) {
        const line = this.buffer.slice(0, idx + 1);
        this.buffer = this.buffer.slice(idx + 1);
        resolveLine(line);
        return;
      }
      this.waiters.push(resolveLine);
    });
  }

  async readReply (): Promise<SmtpReply> {
    const lines: string[] = [];
    for (;;) {
      const line = (await this.readLine()).replace(/\r?\n$/, '');
      lines.push(line);
      const m = /^(\d{3})([ -])/.exec(line);
      if (m && m[2] === ' ') {
        return { code: Number(m[1]), text: lines.join('\n') };
      }
    }
  }

  write (text: string): void {
    this.socket.write(text);
  }

  async command (cmd: string, expect: number[]): Promise<SmtpReply> {
    this.write(`${cmd}\r\n`);
    const reply = await this.readReply();
    if (!expect.includes(reply.code)) {
      throw new Error(`SMTP ${cmd.split(' ')[0]} 失败(${reply.code}): ${reply.text}`);
    }
    return reply;
  }

  close (): void {
    try {
      this.socket.write('QUIT\r\n');
    } catch { /* ignore */ }
    setTimeout(() => {
      try {
        this.socket.destroy();
      } catch { /* ignore */ }
    }, 300);
  }
}

function wrapBase64 (input: string): string {
  return input.replace(/(.{76})/g, '$1\r\n');
}

function buildMime (from: string, to: string[], subject: string, html: string): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const body = wrapBase64(Buffer.from(html, 'utf8').toString('base64'));
  return [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'Date: ' + new Date().toUTCString(),
    '',
    body,
  ].join('\r\n');
}

async function smtpSend (
  cfg: MailConfig,
  subject: string,
  html: string
): Promise<void> {
  const toList = cfg.to.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  if (toList.length === 0) throw new Error('收件人不能为空');
  const from = cfg.from || cfg.user;
  const ehloName = cfg.user.split('@')[0] || 'shcap';

  const rawSocket = cfg.secure
    ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host, rejectUnauthorized: false })
    : net.connect({ host: cfg.host, port: cfg.port });

  await new Promise<void>((resolveConn, rejectConn) => {
    const timer = setTimeout(() => rejectConn(new Error('连接 SMTP 服务器超时')), 15000);
    rawSocket.once(cfg.secure ? 'secureConnect' : 'connect', () => {
      clearTimeout(timer);
      resolveConn();
    });
    rawSocket.once('error', (err) => {
      clearTimeout(timer);
      rejectConn(new Error(`连接 SMTP 服务器失败: ${err.message}`));
    });
  });

  let client = new SmtpClient(rawSocket);
  try {
    const greeting = await client.readReply();
    if (greeting.code !== 220) throw new Error(`SMTP 服务器无响应: ${greeting.text}`);

    await client.command(`EHLO ${ehloName}`, [250]);

    if (!cfg.secure) {
      await client.command('STARTTLS', [220]);
      const secureSocket = tls.connect({
        socket: rawSocket as net.Socket,
        servername: cfg.host,
        rejectUnauthorized: false,
      });
      await new Promise<void>((resolveTls, rejectTls) => {
        secureSocket.once('secureConnect', () => resolveTls());
        secureSocket.once('error', (err) => rejectTls(new Error(`STARTTLS 失败: ${err.message}`)));
      });
      client = new SmtpClient(secureSocket);
      await client.command(`EHLO ${ehloName}`, [250]);
    }

    const authPlain = Buffer.from(`\u0000${cfg.user}\u0000${cfg.pass}`, 'utf8').toString('base64');
    try {
      await client.command(`AUTH PLAIN ${authPlain}`, [235]);
    } catch {
      await client.command('AUTH LOGIN', [334]);
      await client.command(Buffer.from(cfg.user, 'utf8').toString('base64'), [334]);
      await client.command(Buffer.from(cfg.pass, 'utf8').toString('base64'), [235]);
    }

    await client.command(`MAIL FROM:<${from}>`, [250]);
    for (const rcpt of toList) {
      await client.command(`RCPT TO:<${rcpt}>`, [250, 251]);
    }
    await client.command('DATA', [354]);
    client.write(`${buildMime(from, toList, subject, html)}\r\n.\r\n`);
    const done = await client.readReply();
    if (done.code !== 250) throw new Error(`发送失败: ${done.text}`);
  } finally {
    client.close();
  }
}

export interface MailSendResult {
  success: boolean;
  message: string;
  sentAt?: string;
}

export async function sendMail (subject: string, html: string): Promise<MailSendResult> {
  const cfg = getMailConfig();
  if (!cfg.enable) return { success: false, message: '邮件服务未启用' };
  if (!isMailReady(cfg)) return { success: false, message: 'SMTP 配置不完整（服务器/账号/密码）' };
  try {
    await smtpSend(cfg, subject, html);
    return { success: true, message: '发送成功', sentAt: new Date().toISOString() };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

/** 发一封告警邮件（模板内置），失败只打日志，不影响看门狗继续巡检 */
async function sendAlertMail (kind: MailKind): Promise<void> {
  const cfg = getMailConfig();
  let subject = '';
  try {
    const mail = buildAlertMail(kind, alertVars(cfg));
    subject = mail.subject;
    const res = await sendMail(mail.subject, mail.html);
    if (res.success) {
      console.log(`[SHCAP] 邮件已发送: ${mail.subject}`);
    } else {
      console.log(`[SHCAP] 邮件发送失败（${mail.subject}）: ${res.message}`);
    }
  } catch (e) {
    console.log(`[SHCAP] 邮件发送异常（${subject || kind}）: ${(e as Error).message}`);
  }
}

/** 供「发送测试邮件」使用的模板预览 */
export function buildAlertPreview (kind: MailKind): { subject: string; html: string } {
  return buildAlertMail(kind, alertVars(getMailConfig()));
}

let watchdogStarted = false;

async function watchdogTick (): Promise<void> {
  const cfg = getMailConfig();
  if (!cfg.enable || !isMailReady(cfg)) return;
  let online = false;
  try {
    online = !!WebUiDataRuntime.getQQLoginStatus();
  } catch {
    return;
  }
  const prev = loadMailState();
  const now = Date.now();
  if (!prev) {
    // 首次运行：只记录基线，不补发历史状态
    saveMailState({ online, at: now });
    return;
  }
  if (prev.online === online) return;
  saveMailState({ online, at: now });
  if (!online) {
    if (cfg.notifyOffline) await sendAlertMail('offline');
  } else if (cfg.notifyRecover) {
    await sendAlertMail('recovered');
  }
}

export function startMailWatchdog (): void {
  if (watchdogStarted) return;
  watchdogStarted = true;
  console.log('[SHCAP] 邮件告警看门狗已启动（每 60 秒检测一次 QQ 在线状态）');
  // 启动时先跑一次：与上次落盘状态不同会立即发信（进程重启不再吞掉恢复通知）
  setTimeout(() => {
    void watchdogTick();
  }, 10 * 1000);
  setInterval(() => {
    void watchdogTick();
  }, 60 * 1000);
}
