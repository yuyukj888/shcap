<div align="center">

# SHCAP

**NapCat 的延续版 · 现代化 QQ 机器人 OneBot 11 协议端**

[![version](https://img.shields.io/badge/version-1.0.5-2f6fed?style=flat-square)](https://github.com/yuyukj888/shcap/releases)
[![docker](https://img.shields.io/badge/docker-ghcr.io%2Fyuyukj888%2Fshcap-2496ed?style=flat-square)](https://github.com/yuyukj888/shcap/pkgs/container/shcap)
[![OneBot11](https://img.shields.io/badge/OneBot-11-4c1?style=flat-square)](https://11.onebot.dev/)
[![QQ群](https://img.shields.io/badge/QQ%E7%BE%A4-SH%E5%B7%A5%E4%BD%9C%E5%AE%A4-12b7f5?style=flat-square)](https://qm.qq.com/q/j6oy4NvXbi)

[快速开始](#一快速开始) · [邮件告警](#四邮件告警) · [常见问题](#六常见问题) · [联系与赞助](#八联系与赞助)

</div>

---

## 这是什么

SHCAP 是 [NapCat](https://github.com/NapNeko/NapCatQQ) 的延续版（基于 NapCat 4.18.42 独立维护），
把「QQ 机器人 + OneBot 11」做成一个**装完就能用**的成品：

- 兼容 **OneBot 11**：HTTP / WebSocket 正向（服务端）、反向（客户端）都支持
- 保留 **NapCat 插件生态**：`.napcat-plugin` 与 `plugins/` 目录即插即用
- 内置 **WebUI**：Token 登录、实时日志、在线改配置、插件管理、版本管理
- 内置 **HTML 邮件告警**：掉线、恢复、登录失败、需要验证都会发信，手机与电脑都好读
- **重启后免验证快速登录**：固定主机名 + 优雅退出，容器重建不再反复要求新设备验证
- 独立品牌与蓝色主题（SH 标识），不再依赖上游仓库

> **关于 QQ 版本**：镜像内是 QQ **3.2.35**；NapCat 4.18.42 的偏移表主要覆盖 3.2.30–3.2.35 区间。
> 如果你自己换 QQ deb 包，注意 `/opt/QQ/resources/app/package.json` 的 `main` 必须回到 `./loadNapCat.js`，
> 否则只有 QQ 进程、没有 NapCat（详见 [打包自己的 QQ 版本](#打包自己的-qq-版本)）。

---

## 一、快速开始

官方镜像 `ghcr.io/yuyukj888/shcap` 已经把 **SHCAP 界面 + HTML 邮件模板 + 优雅退出补丁**全部打了进去。
**拉下来就是 SHCAP**，不需要再下载 Shell 包、也不用覆盖文件。

> 镜像约 1.57 GB，已内置运行时依赖（容器里没有 node/npm）。
> 当前 digest：`sha256:ca49a492028c7ed562bc217919dc5cb45fe53612c3ac820f85ca26de7a074d7c`
> 国内拉不动 `ghcr.io` 时换成南京大学镜像源：`ghcr.nju.edu.cn/yuyukj888/shcap:1.0.5`

### 方式 A：docker run

```bash
mkdir -p /opt/shcap/{config,qq} && cd /opt/shcap

docker run -d --name shcap \
  --restart unless-stopped \
  --hostname "SHCAP的电脑" \
  --stop-timeout 60 \
  -e ACCOUNT=你的QQ号 \
  -p 6099:6099 \
  -p 3001:3001 \
  -v /opt/shcap/config:/app/napcat/config \
  -v /opt/shcap/qq:/app/.config/QQ \
  ghcr.io/yuyukj888/shcap:1.0.5
```

### 方式 B：docker compose（推荐长期使用）

```bash
git clone https://github.com/yuyukj888/shcap.git && cd shcap/deploy
cp .env.example .env        # 填 ACCOUNT（QQ 号），可选 NAPCAT_QUICK_PASSWORD
docker compose up -d
```

`deploy/docker-compose.yml` 已经配好三件关键的事：

| 配置 | 作用 |
|---|---|
| `hostname: "SHCAP的电脑"` | 固定设备名。Docker 默认用容器 ID 当主机名，重建一次 QQ 就当新设备，反复要验证 |
| `stop_grace_period: 60s` | 给 QQ 留出退出时间，把登录态写回卷（否则重启必掉登录） |
| `./config`、`./qq` 两个卷 | 配置与 QQ 登录态持久化，重建容器不丢 |

> 只有想自己改界面 / 挂插件目录时，才需要取消注释 `./napcat:/app/napcat`；镜像里已经内置了这套 Shell。

### 方式 C：覆盖成自己的构建产物（二开）

改完界面对位覆盖即可：

```bash
git clone https://github.com/yuyukj888/shcap.git && cd shcap
corepack enable && pnpm install && pnpm build:webui && pnpm build:shell

docker cp packages/napcat-shell/dist/static      shcap:/app/napcat/static
docker cp packages/napcat-shell/dist/napcat.mjs  shcap:/app/napcat/napcat.mjs
docker restart shcap
```

---

## 二、第一次使用

### 1. 拿 WebUI Token

```bash
docker logs shcap 2>&1 | grep -i token
# [NapCat] [WebUi] WebUi Token: xxxxxxxxxxxx
```

### 2. 登录面板

浏览器打开 `http://服务器IP:6099/webui`，输入上面的 Token。

### 3. 登录 QQ

QQ 未登录时面板会自动跳到登录页：

- **扫码登录**：手机 QQ 扫面板上的二维码
- 若提示「新设备验证」，按手机提示完成一次即可（设备名固定后不会再反复要求）

登录成功后面板「基础信息」会显示 QQ 号与昵称，日志出现 `[Core] [Login] 登录成功`。

### 4. 接上你的机器人框架

「网络配置」→ 新增：

| 类型 | 地址 |
|---|---|
| WebSocket 服务端（给 AstrBot / NoneBot / 云崽 连） | `ws://服务器IP:3001` |
| 或 HTTP 服务端 + HTTP 上报 | 按框架要求填 |

连接成功后日志出现 `OneBot11 适配器初始化完成`、`[OneBot] [HTTP Server Adapter] Start On 0.0.0.0:3001`。

---

## 三、重启后保持登录

这一版的容器**重启不用重新扫码**，靠三件事配合：

1. **固定主机名**（`hostname`）：QQ 认设备名，容器 ID 一变就是「新设备」
2. **优雅退出**：镜像里的 `/app/entrypoint.sh` 末尾是 `exec gosu napcat /opt/QQ/qq …`，
   让 QQ 成为容器 PID1，`docker stop` 的 SIGTERM 能直达 QQ，它才有机会把登录态写盘
3. **快速登录票据**：登录态落在 `/app/.config/QQ` 卷里，重启后自动快速登录

实测：`docker stop` 从 61 秒（超时强杀）降到 1–2 秒；连续 `stop/start` 与 `compose up --force-recreate`
都是「正在快速登录 → 成功」，不再弹验证。

> 边界：断电、OOM、`docker kill` 这类非优雅退出，票据仍可能没落盘，需要重新验证一次。
> 上游镜像若更新了 entrypoint，要用仓库里的 `deploy/patches/entrypoint.sh` 重新覆盖。

---

## 四、邮件告警

面板「系统配置 → 邮件通知」里填 SMTP 即可，发信由内置看门狗负责（开机启动，不依赖打开面板）。

### 会发什么

| 事件 | 触发条件 |
|---|---|
| 掉线提醒 | 登录态从「在线」变成「离线」 |
| 恢复通知 | 登录态从「离线」变回「在线」 |
| 发送测试邮件 | 手动点按钮，发一封真实样式的预览 |

邮件是响应式 HTML：状态色带 + 关键指标 + 事件经过 + 最近日志 + 命令注解 + 一键打开面板，
手机上单列、电脑上留白，深色模式也适配。

### 配置项

| 字段 | 说明 |
|---|---|
| SMTP 服务器 / 端口 | 如 `smtp.exmail.qq.com` / `465` |
| SSL 直连 | 465 端口要打开；587 用 STARTTLS 时关闭 |
| 邮箱账号 / 密码授权码 | 授权码不是登录密码 |
| 发件人 / 收件人 | 收件人多个用逗号分隔 |

### 自定义模板（可选）

配置目录下的 `config/mail_tpl.json` 支持热加载，改完下一封信就生效，**不用重启容器**：

```json
{
  "offline":   "<html>… %%TIME%% %%UIN%% %%NICK%% %%PANEL%% %%HOST%% …</html>",
  "recovered": "<html>…</html>"
}
```

占位符：`%%TIME%%` 时间、`%%UIN%%` QQ 号、`%%NICK%%` 昵称、`%%PANEL%%` 面板地址、
`%%HOST%%` 服务器地址、`%%MAILFROM%%`、`%%MAILTO%%`。
镜像内的 `napcat.mjs` 已内联一份默认模板，删掉 `mail_tpl.json` 也能正常发信。

### 排错

- 状态文件：`config/mail_state.json`（上次在线状态，进程重启不丢基线）
- 日志关键字：`[SHCAP] 邮件已发送`、`[SHCAP] 邮件发送失败（主题）: 原因`
- 一直收不到：先点「发送测试邮件」，报错会直接写在面板与容器日志里

---

## 五、目录与数据

```
deploy/
  docker-compose.yml      # 推荐部署方式（固定主机名 + 优雅停止 + 数据卷）
  .env.example            # ACCOUNT / NAPCAT_QUICK_PASSWORD
  Dockerfile              # 官方镜像构建
  patches/entrypoint.sh   # 优雅退出补丁（QQ 成为 PID1）
packages/                 # SHCAP 源码（shell / webui / framework / adapter …）
```

容器内重要路径：

| 路径 | 内容 |
|---|---|
| `/app/napcat/config` | 配置：webui.json、onebot11_*.json、mail.json、mail_tpl.json、mail_state.json |
| `/app/.config/QQ` | QQ 登录态与缓存（重启免验证靠它） |
| `/app/napcat` | SHCAP Shell（napcat.mjs + static + node_modules） |

---

## 六、常见问题

**Q：为什么掉线了没收到邮件？**
v1.0.5 之前的告警有两个坑：一是检测只匹配中文「已离线」等措辞，而真实掉线日志是
`[Login] Login Error,ErrType: 1 ErrCode: 3`；二是只在打开面板邮件页时才启动看门狗。
现在看门狗随进程启动，恢复也会发信。升级后仍收不到，先看 [排错](#排错)。

**Q：被踢下线（KickedOffLine）是什么原因？**
日志 `[KickedOffLine] [下线通知] 你的账号当前登录已失效` 是 **QQ 服务端**主动踢的
（异地登录、手机端操作、风控），不是网络抖动。重新登录即可；这种事单靠重连救不回来。

**Q：设备名怎么变了？**
Docker 默认拿容器 ID 当 hostname。本仓库 compose 已固定为 `SHCAP的电脑`；
历史遗留的 12 位 ID 设备记录要去手机 QQ「登录设备管理」里删掉。

**Q：重启后还是要验证码？**
先确认 `docker stop` 是 1–2 秒完成（而不是等 60 秒超时）。超时说明 entrypoint 没执行到 `exec`，
用 `deploy/patches/entrypoint.sh` 覆盖 `/app/entrypoint.sh` 后重建。另可配 `NAPCAT_QUICK_PASSWORD` 兜底。

**Q：怎么升级？**
```bash
docker pull ghcr.io/yuyukj888/shcap:latest
docker compose up -d      # config 与 qq 卷不动，登录态保留
```
跨大版本前建议备份 `./config` 与 `./qq`。

### 打包自己的 QQ 版本

`deploy/Dockerfile.qq335` 是可复现的参考：在基础镜像上 `dpkg -i` 指定 QQ 包后，
必须把 `/opt/QQ/resources/app/package.json` 的 `main` 改回 `./loadNapCat.js`，
否则 NapCat 不会被注入。

---

## 七、源码构建（本地开发）

```bash
corepack enable
pnpm install

pnpm build:webui     # 前端（WebUI）
pnpm build:shell     # Shell（napcat.mjs）
pnpm typecheck
```

产物在 `packages/napcat-shell/dist`，按 [方式 C](#方式-c覆盖成自己的构建产物二开) 覆盖到容器即可。

---

## 八、联系与赞助

<div align="center">

### 有问题、想定制、想进群交流

[**点击加我 QQ 好友**](https://qm.qq.com/q/PckmQNeBau)　·　[**点击加入 QQ 群【【Fivem】SH工作室】**](https://qm.qq.com/q/j6oy4NvXbi)

</div>

**SH 工作室业务范围**：Fivem 插件定制 · 开发 / 出售 / 成品端 · 网站搭建
营业时间：周一至周五 10:00–22:00

如果 SHCAP 帮到了你，欢迎扫码赞助，一分也是爱：

<div align="center">

<img src="docs/images/sponsor.png" alt="SH 工作室赞助码" width="360">

<sub>支付宝 / 微信 均可</sub>

</div>

---

## 鸣谢

- [NapCatQQ](https://github.com/NapNeko/NapCatQQ)：本项目的基础与长期参考
- [OneBot 11](https://11.onebot.dev/)：协议标准
- 所有 issue、PR 与群里帮忙测试的朋友

## 许可

继承上游 NapCat 的许可条款，详见 [LICENSE](LICENSE)。使用本项目造成的任何后果由使用者自行承担，
请遵守腾讯 QQ 用户协议与当地法律法规，**不要用于任何违法用途**。
