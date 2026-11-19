# 发布流程（SHCAP）

每次发版按这份清单走，保证 Release 资产、镜像、README 三者一致。
**原则：Assets 只放几十 MB 的小包，镜像走 GHCR**（与 NapCat 上游同构）。

---

## 1. 版本号

| 位置 | 改什么 |
|---|---|
| `package.json` | `"version": "x.y.z"` |
| `CHANGELOG.md` | 顶部加 `## x.y.z` 段（改了什么、怎么验证的） |
| `README.md` | 标题下徽章 `version-x.y.z`、快速开始里的镜像 tag |
| `deploy/docker-compose.yml` | `image: ghcr.io/yuyukj888/shcap:x.y.z` |

## 2. 构建前端 + Shell

```bash
corepack enable && pnpm install
pnpm build:webui && pnpm build:shell
# 产物：packages/napcat-shell/dist（napcat.mjs + static/）
```

## 3. 打 NapCat.Shell.zip（必须内置 node_modules）

上游的 `NapCat.Shell.zip` 是**自带依赖**的（约 29 MB / 820 文件）。我们照做，否则别人配 `napcat-docker` 基础镜像会报 `Cannot find package 'express'`。

在运行中的服务器上：

```bash
rm -rf /tmp/shellpkg && mkdir -p /tmp/shellpkg/napcat
cd /path/to/napcat          # 容器里 /app/napcat 对应的宿主目录
tar cf - --exclude=config --exclude=cache --exclude=logs \
        --exclude="*.bak*" --exclude="*.orig*" --exclude="*.db" --exclude="*.db-*" \
        napcat | tar xf - -C /tmp/shellpkg
# 用新构建的 napcat.mjs 覆盖（邮件模板内联版）
cp packages/napcat-shell/dist/napcat.mjs /tmp/shellpkg/napcat/napcat.mjs
cd /tmp/shellpkg/napcat && zip -qr -9 ../NapCat.Shell.zip .
```

验收标准：

```bash
unzip -l NapCat.Shell.zip | tail -1                  # 文件数 ~960（含依赖）
unzip -l NapCat.Shell.zip | grep -c node_modules/    # 必须 > 500
```

## 4. 脱敏审计（0 命中才能发）

真实敏感串**只放本地私有文件**（`PATTERNS_FILE`，一行一个），不进仓库、不进 Release 正文：

```bash
# ~/.shcap-private-patterns 里写：服务器IP / QQ号 / 昵称 / 收发邮箱 / SMTP授权码 / 两个 token / QQ密码
PATTERNS_FILE=~/.shcap-private-patterns ./scripts/preflight-audit.sh NapCat.Shell.zip shcap-docker-x.y.z.tar.gz
```

脚本会解包后逐个文件扫描，命中即退出 1，同时检查 `*.bak-*`、`*.orig-*`、`*.log` 调试残留。
审计不过**禁止上传**。

## 5. docker 整包 tar.gz

```bash
tar czf shcap-docker-x.y.z.tar.gz \
  docker-compose.yml .env.example README.md patches/entrypoint.sh napcat/ qq/
```

## 6. 镜像：服务器本地 build + push

> ⚠️ 本账号的 GitHub Actions 一直 `startup_failure`（连最小 workflow 都失败，与 YAML 无关），所以**不要挂 CI 构建**，直接在有 Docker 的机器上推。

```bash
docker build -f deploy/Dockerfile -t ghcr.io/yuyukj888/shcap:x.y.z .
docker tag ghcr.io/yuyukj888/shcap:x.y.z ghcr.io/yuyukj888/shcap:latest
docker push ghcr.io/yuyukj888/shcap:x.y.z && docker push ghcr.io/yuyukj888/shcap:latest
docker images --digests | grep shcap          # 记下 digest 写进 README 与 Release
```

冒烟（临时容器 + 临时卷，不碰生产）：

```bash
docker run -d --name smoke -v /tmp/sm/config:/app/napcat/config -v /tmp/sm/qq:/app/.config/QQ ghcr.io/yuyukj888/shcap:x.y.z
docker logs smoke 2>&1 | grep -aE "NapCat Shell App Loading|WebUi Token"
docker exec smoke sh -c 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:6099/webui/'   # 200
docker exec smoke cat /proc/1/cmdline                                                          # /opt/QQ/qq
time docker stop smoke                                                                          # 秒级
docker rm -f smoke && rm -rf /tmp/sm
```

## 7. Release

```bash
gh release create vx.y.z --notes-file release_notes_vx.y.z.md
gh release upload vx.y.z NapCat.Shell.zip shcap-docker-x.y.z.tar.gz --clobber
gh release edit vx.y.z --notes-file release_notes_vx.y.z.md     # 改资产说明后重发
```

Release 正文至少包含：变更摘要、**发布资产表（文件名 + 字节数）**、镜像 digest、自己 build 的命令（方式 D）、实测结果。

## 8. 提交与 tag

```bash
git add -A && git commit -m "chore(release): vx.y.z"
git tag -f vx.y.z && git push origin main && git push -f origin vx.y.z
```

tag 必须指向**发布提交本身**（含 README/compose 的版本改动），不要指向前一个提交。

---

## 踩过的坑

- GitHub Actions 在本账号不可用 → 只能本地 build/push，别再加 workflow。
- 匿名 `docker pull ghcr.io` 在国内服务器很慢（1.57 GB）→ 文档里给 `ghcr.nju.edu.cn` 镜像源。
- Windows 上没有 python → 渲染/校验放服务器跑。
- `scp` 一次给多个远端源会报 `protocol error: filename does not match request` → 一次一个。
- 用 `printf '%s'` 拼含反引号的 markdown 会触发命令替换，内容被吃掉 → 用文件写入工具。
- 打包时忘排除 `*.bak-*` 会把调试文件带进发布包（v1.0.5 犯过，已 `--clobber` 重传）。
