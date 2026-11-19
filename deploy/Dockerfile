# syntax=docker/dockerfile:1
# SHCAP 官方镜像：在 NapCat 运行时之上覆盖 SHCAP 自己的 WebUI / 邮件告警 / 优雅退出补丁，
# 让用户 `docker compose up -d` 直接就得到 SHCAP，而不用先去下载 Shell 包再挂载。
#
# 构建上下文为仓库根目录；先把发布包解压到 build/napcat/（CI 里由 workflow 完成）：
#   mkdir -p build && unzip -q NapCat.Shell.zip -d build/napcat
#   docker build -f deploy/Dockerfile -t shcap:dev .
FROM docker.io/mlikiowa/napcat-docker:latest

# SHCAP 的 Shell 覆盖层（含 SHCAP 界面、HTML 邮件模板内联版 napcat.mjs）
COPY build/napcat/ /app/napcat/

# 优雅退出补丁：QQ 成为 PID1，docker stop 时直接收到 SIGTERM，登录态才能落盘
COPY deploy/patches/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 6099 3001
