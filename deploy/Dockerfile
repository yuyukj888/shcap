# SHCAP 官方镜像构建：把 SHCAP Shell 覆盖到 QQ 运行时之上
#
# 构建上下文需要 napcat/（SHCAP Shell 全量目录，含 node_modules）与 entrypoint.sh。
# 说明：镜像内没有 node/npm，运行时的 express 等依赖来自 napcat/node_modules，
# 因此 napcat/ 必须带上 node_modules（NapCat.Shell.zip 不含依赖，只适合手动部署）。
#
#   docker build -t ghcr.io/yuyukj888/shcap:1.0.5 -f deploy/Dockerfile .
FROM docker.io/mlikiowa/napcat-docker:latest

# SHCAP Shell：内置界面 + HTML 邮件模板 + 邮件状态持久化
COPY napcat/ /app/napcat/

# 优雅退出补丁：SIGTERM 直达 QQ 进程，重启后登录态可复用
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 6099 3001
