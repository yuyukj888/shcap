# SHCAP

> **SHCAP 是 [NapCat](https://github.com/NapNeko/NapCatQQ) 的延续版**（基于 NapCat 4.18.42 独立维护），
> 一个现代化、轻量级的 QQ 机器人 **OneBot 11** 协议端。

SHCAP 在保持 OneBot 11 协议、插件生态、API 行为与 NapCat 完全兼容的前提下，由我们独立维护与持续更新：

- ✅ 兼容 **OneBot 11**（HTTP / WebSocket 正向、反向）
- ✅ 保留 **NapCat 插件生态**（`.napcat-plugin`、`plugins/` 目录即插即用）
- ✅ 内置 **WebUI**（Token 登录、实时日志、在线配置、插件管理、版本管理）
- ✅ 内置 **邮件告警**（登录失败 / 需要验证 / 掉线 / 二维码登录，可选）
- ✅ Docker 一键部署，开箱即用
- ✅ 独立品牌与蓝色主题（SH 标识），不再依赖上游仓库

> 兼容基线：当前代码基于 **NapCat 4.18.42 + QQ 3.2.30-50969**。
> 更高版本 QQ（如 3.2.35）因注入点变化暂不兼容，请先使用 3.2.30 客户端。

---

## 一、Docker 一键部署（推荐）

官方镜像 `ghcr.io/yuyukj888/shcap` 已经把 SHCAP 的界面、HTML 邮件告警、优雅退出补丁全部打进去了，
**拉下来就是 SHCAP，不需要再下载 Shell 包、也不用覆盖文件**。

### 方式 A：docker run（直接复制执行）

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

`deploy/docker-compose.yml` 已配好固定主机名（避免 QQ 当成新设备）、`stop_grace_period: 60s`（让登录态落盘）、
配置与 QQ 数据卷（`./config`、`./qq`），重建容器不丢登录。

> 国内拉不动 ghcr.io 时换成南京大学镜像源：`ghcr.nju.edu.cn/yuyukj888/shcap:1.0.5`。

镜像本身：约 1.57 GB，已内置 `node_modules`（容器里没有 node/npm，运行时依赖只能随镜像带），
digest `sha256:ca49a492028c7ed562bc217919dc5cb45fe53612c3ac820f85ca26de7a074d7c`。
已实测：容器内出现 `NapCat Shell App Loading...`、WebUI 返回 200、QQ 进程是容器 PID1（`docker stop` 1–2 秒完成，登录态可落盘）。

### 方式 C：自己覆盖界面（改壳 / 二开）

镜像里的 `/app/napcat` 就是 SHCAP Shell，要换成自己的构建产物：

```bash
git clone https://github.com/yuyukj888/shcap.git && cd shcap
corepack enable && pnpm install && pnpm build:webui && pnpm build:shell

docker cp packages/napcat-shell/dist/static      shcap:/app/napcat/static
docker cp packages/napcat-shell/dist/napcat.mjs  shcap:/app/napcat/napcat.mjs
docker restart shcap
```

### 3. 登录 WebUI

```bash
docker logs shcap 2>&1 | grep -i token      # 取 WebUI Token
```

浏览器打开 `http://服务器IP:6099/webui`，输入 Token 登录；
QQ 未登录时打开 `基础信息`，用手机 QQ 扫二维码登录。

### 4. 配置 OneBot（连 AstrBot / NoneBot / 云崽 等）

`网络配置` 中新增：
- **WebSocket 服务端**：`ws://服务器IP:3001`（默认）
- 或 **HTTP 服务端** + **HTTP 上报**

连接成功后日志出现 `OneBot11 适配器初始化完成`、`[OneBot] [HTTP Server Adapter] Start On 0.0.0.0:3001`。

---

## 二、源码构建（本地开发）

```bash
# 环境：Node.js >= 22，pnpm（corepack enable 或 npm i -g pnpm）
pnpm install
pnpm build:webui     # 构建 WebUI 前端 → packages/napcat-webui-frontend/dist
pnpm build:shell     # 打包壳 + 前端 → packages/napcat-shell/dist
```

产物结构：

```
packages/napcat-shell/dist/
├── napcat.mjs        # 主程序
├── static/           # WebUI 静态资源
├── worker/ native/   # 运行依赖
├── loadNapCat.js
├── package.json
└── qqnt.json
```

Linux 服务器上可直接把 `dist/` 同步到容器的 `/app/napcat/`（保留 `config/`、`plugins/`）。

---

## 三、邮件告警（推荐用 WebUI 配置）

### 方式 A：WebUI 内配置（推荐，v1.0.1 起内置）

登录 WebUI → **系统配置 → 邮件通知**，填写 SMTP 服务器 / 端口 / 账号 / 授权码 / 收件人，
打开「启用邮件服务」，点「发送测试邮件」确认能收到即可。

- 配置保存在 `config/mail.json`，密码回显为 `******`，留空表示不修改；
- 内置后台看门狗每 60 秒检测一次 QQ 在线状态，状态一变就发信；上次状态记在 `config/mail_state.json`，
  进程重启后仍能正确判断「恢复上线」，不会像旧版那样把重启后的第一次恢复吞掉；
- 邮件是响应式 HTML（深色模式、手机/电脑自适应），带时间线、最近日志与可点的面板入口；
  「发送测试邮件」发的就是这封模板，可直接预览效果；
- 支持 SSL 直连（465）与 STARTTLS（587）两种方式。

### 方式 B：外部脚本（旧方案，仍需 cron）

登录失败、需要验证、掉线、二维码登录时自动发邮件：

```bash
mkdir -p /opt/shcap/shcap-notify
# 将仓库 scripts/shcap-notify 下的 monitor.py / config.json 放入该目录
vi /opt/shcap/shcap-notify/config.json    # 填 SMTP 账号、授权码、收件人
crontab -e
*/2 * * * * cd /opt/shcap/shcap-notify && /usr/bin/python3 monitor.py >/dev/null 2>&1
```

`config.json` 关键字段：

```json
{
  "enabled": true,
  "smtp": { "host": "smtp.qq.com", "port": 465, "ssl": true,
            "user": "你的邮箱", "password": "SMTP授权码", "from": "你的邮箱" },
  "to": ["收件邮箱"],
  "events": { "login_fail": true, "need_verify": true, "offline": true, "qr_login": false }
}
```

> 说明：内置邮件通知当前覆盖「掉线与恢复」两类事件；登录失败 / 需人工验证的细粒度事件仍建议配合方式 B。

---

## 三点六、重启后保持登录（v1.0.5）

Docker 重建容器后会丢掉登录态，常见于改配置 / 升级镜像时。三条一起做才有效：

1. **固定主机名**——Docker 默认把容器 ID 当 hostname，QQ 端会认为换了设备，频繁要求新设备验证：

   ```yaml
   hostname: "SHCAP的电脑"
   ```

2. **给 QQ 留出退出落盘时间**——`docker stop` 默认 10 秒就 SIGKILL，票据没写回卷，下次启动只能重新验证：

   ```yaml
   stop_grace_period: 60s
   ```

3. **让 QQ 进程直接收到 SIGTERM**——镜像里 `entrypoint.sh` 用 `gosu ... qq` 前台启动，QQ 是 bash 的子进程，
   SIGTERM 落在 bash 上，QQ 收不到。把结尾两行改成 `exec gosu napcat /opt/QQ/qq ...` 即可（`docker-compose.yml`
   里挂载改过的 `entrypoint.sh`，或构建自有镜像时替换）。

可选：在 `.env` 里配置 `NAPCAT_QUICK_PASSWORD`（QQ 登录密码），快速登录票据失效时可直接密码回退重登。

---

## 三点七、QQ 版本与 3.2.35 镜像

"系统信息"里的 QQ 版本读的是容器内 `/opt/QQ/resources/app/package.json`，**不是运行时真实版本**。
上游基础镜像（`napcat-docker:latest`）里这个文件停在 `3.2.30-50969`，而运行时版本来自 `/opt/QQ/version.json`，
实际是 `3.2.35-54395`——所以"关于"页显示 3.2.30，日志里的偏移表却按 3.2.35 报。

想让"关于"页也显示 3.2.35，用 `deploy/Dockerfile.qq335` 自建镜像：

1. 把 `linuxqq_3.2.35-54395_amd64.deb` 放进 `deploy/`；
2. 在 `deploy/docker-compose.yml` 里把 `image:` 换成注释里的 `build:`（context 为 `.`，dockerfile 为 `Dockerfile.qq335`）；
3. `docker compose build && docker compose up -d`。

关键点：`dpkg -i` 会覆盖 `package.json` 的 `main`，必须改回 `./loadNapCat.js`，否则容器只有 QQ 进程、
没有 NapCat / OneBot（Dockerfile 里已经包含这一步）。

> 日志出现 `[Core] [Packet] PacketBackend 不支持当前QQ版本架构：3.2.35-54395-x64` 属已知现象：
> NapCat 内核偏移表未覆盖该构建号，基础收发一般仍正常，但这一组合不在官方支持范围内。

---


## 三点五、插件商店说明

上游 NapCat 仓库（`NapNeko/NapCatQQ`）已删除，其插件索引 `napcat-plugin-index` 随之失效，
在线插件商店无法再拉到有效列表。SHCAP 因此**下线了插件商店入口**：请从 GitHub 手动下载插件
Release 包（zip），在 **插件管理 → 安装插件** 中上传安装。

---

## 四、目录与端口

| 路径 | 说明 |
| --- | --- |
| `/app/napcat/config` | 全局配置（`webui.json`、`onebot11_<QQ>.json` 等） |
| `/app/.config/QQ` | QQ 账号数据、登录态 |
| `/app/napcat/plugins` | 插件目录 |
| `/app/napcat/static` | WebUI 静态资源 |

| 端口 | 用途 |
| --- | --- |
| 6099 | WebUI |
| 3001 | OneBot HTTP / WebSocket |

---

## 四点五、发布包说明（GitHub Releases）

每个 Release 页面包含三类文件：

| 文件 | 用途 |
| --- | --- |
| `Source code (zip / tar.gz)` | GitHub 自动附带的**完整源代码**，可直接编译 |
| `NapCat.Shell.zip` | **WebUI 版本管理 / 手动更新**用的程序包（`napcat.mjs`、`static/`、`worker/`、`native/`、`loadNapCat.js`、`package.json`、`qqnt.json`；**不含 `config/`、`plugins/`**） |
| `shcap-docker.tar.gz` | **Docker 一键部署整包**：已构建好的 SHCAP Shell + `docker-compose.yml` + `.env.example` + `README.md`，解压改 `ACCOUNT` 后 `docker compose up -d` 即可 |

### 更新行为（不会覆盖设置）

WebUI →「基础信息」→ 点版本号 → 版本管理 → 选择 `v1.0.2` → 更新，然后 `docker restart shcap`。

- 更新只替换程序文件；发布包**不含 `config/`**，因此 `config/webui.json`（WebUI 令牌/主题）、`config/mail.json`（邮件配置）、`config/onebot11_*.json` 等全部保留；
- 实测：更新前后 `webui.json` / `mail.json` 的 md5 不变，`docker logs` 可见 `Preserving existing user config: config/napcat.json` 与 `更新完成`；
- 下载走 GitHub 加速镜像（`gh-proxy.com` 等），服务器在国内也可更新。

---

## 五、常见问题

**Q：WebUI 打不开？**
检查 `docker ps` 端口映射、防火墙放行 6099；`docker logs shcap` 是否出现 `WebUI Token`。

**Q：验证码 / 扫码失败？**
容器内带 Xvfb 虚拟显示，首次登录需扫码；账号风控请更换网络或稍后再试。

**Q：更新后界面回退成原版？**
`static/` 是挂载或拷贝的产物，重新执行「方式 C」覆盖即可。

**Q：能升级到 QQ 3.2.35 吗？**
暂不支持（注入点不兼容），请使用 3.2.30 客户端；后续版本适配中。

---

## 六、致谢与声明

- 项目基于 **[NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ)** 4.18.42 派生，遵循上游开源许可；
- OneBot 11 协议实现参考原 NapCat 代码，插件生态完全兼容；
- 本项目仅用于**个人学习与自建机器人**，请遵守 QQ 用户协议与所在地法律法规，勿用于商业滥用。
