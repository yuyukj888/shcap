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

### 方式 A：docker run（直接复制执行）

```bash
mkdir -p /opt/shcap/{config,qq,plugins} && cd /opt/shcap

docker run -d --name shcap \
  --restart unless-stopped \
  -e ACCOUNT=你的QQ号 \
  -p 6099:6099 \
  -p 3001:3001 \
  -v /opt/shcap/config:/app/napcat/config \
  -v /opt/shcap/qq:/app/.config/QQ \
  -v /opt/shcap/plugins:/app/napcat/plugins \
  mlikiowa/napcat-docker:latest
```

> 想用 SHCAP 的品牌与主题，见「方式 C：覆盖自己的构建产物」。

### 方式 B：docker compose（推荐长期使用）

新建 `/opt/shcap/docker-compose.yml`：

```yaml
services:
  shcap:
    image: mlikiowa/napcat-docker:latest
    container_name: shcap
    restart: unless-stopped
    environment:
      - ACCOUNT=你的QQ号            # 留空则扫码登录
      - WEBUI_TOKEN=换成你自己的随机串  # 可选：固定 WebUI 登录令牌
      - TZ=Asia/Shanghai
    ports:
      - "6099:6099"   # WebUI
      - "3001:3001"   # OneBot HTTP/WS
    volumes:
      - ./config:/app/napcat/config
      - ./qq:/app/.config/QQ
      - ./plugins:/app/napcat/plugins
```

```bash
cd /opt/shcap && docker compose up -d
```

### 方式 C：覆盖 SHCAP 自己的构建产物（换成我们的界面）

```bash
# 1. 本地/服务器构建
git clone https://github.com/yuyuk888/shcap.git && cd shcap
corepack enable
pnpm install
pnpm build:webui
pnpm build:shell          # 产物在 packages/napcat-shell/dist

# 2. 覆盖到容器
docker cp packages/napcat-shell/dist/static     shcap:/app/napcat/static
docker cp packages/napcat-shell/dist/napcat.mjs shcap:/app/napcat/napcat.mjs
docker restart shcap
```

> 也可以在 compose 里直接挂载：
> `- ./packages/napcat-shell/dist/static:/app/napcat/static:ro`
> `- ./packages/napcat-shell/dist/napcat.mjs:/app/napcat/napcat.mjs:ro`

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

## 三、邮件告警（可选）

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
