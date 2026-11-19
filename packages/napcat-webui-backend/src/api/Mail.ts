import { RequestHandler } from 'express';

import { sendError, sendSuccess } from '@/napcat-webui-backend/src/utils/response';
import {
  buildAlertPreview,
  getMailConfig,
  isMailReady,
  MailConfig,
  saveMailConfig,
  sendMail,
  startMailWatchdog,
} from '@/napcat-webui-backend/src/helper/MailService';

const MASK = '******';

export const GetMailConfigHandler: RequestHandler = async (_req, res) => {
  startMailWatchdog();
  const cfg = getMailConfig();
  return sendSuccess(res, {
    config: { ...cfg, pass: cfg.pass ? MASK : '' },
    ready: isMailReady(cfg),
  });
};

export const SaveMailConfigHandler: RequestHandler = async (req, res) => {
  try {
    startMailWatchdog();
    const body = (req.body ?? {}) as { config?: Partial<MailConfig> };
    const patch = body.config ?? {};
    if (typeof patch.pass === 'string' && patch.pass === MASK) {
      delete patch.pass;
    }
    const saved = saveMailConfig(patch);
    return sendSuccess(res, {
      config: { ...saved, pass: saved.pass ? MASK : '' },
      ready: isMailReady(saved),
    });
  } catch (e) {
    return sendError(res, (e as Error).message);
  }
};

export const TestMailHandler: RequestHandler = async (req, res) => {
  try {
    startMailWatchdog();
    const body = (req.body ?? {}) as { to?: string };
    const cfg = getMailConfig();
    const to = (body.to || cfg.to || '').trim();
    if (!to) return sendError(res, '请先填写收件人');
    const preview = buildAlertPreview('offline');
    const result = await sendMail(
      '[SHCAP] 测试邮件',
      preview.html
    );
    return sendSuccess(res, { to, ...result });
  } catch (e) {
    return sendError(res, (e as Error).message);
  }
};

export const SendAlertHandler: RequestHandler = async (req, res) => {
  try {
    startMailWatchdog();
    const body = (req.body ?? {}) as { subject?: string; html?: string };
    const result = await sendMail(body.subject || '[SHCAP] 测试告警', body.html || '<p>测试告警</p>');
    return sendSuccess(res, result);
  } catch (e) {
    return sendError(res, (e as Error).message);
  }
};
