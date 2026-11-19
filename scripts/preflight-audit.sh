#!/usr/bin/env bash
# 发布前脱敏审计：命中任何敏感串就退出 1，禁止上传。
#
# 用法：
#   ./scripts/preflight-audit.sh <待检查目录或 zip 包>...
#   PATTERNS_FILE=~/.shcap-private-patterns ./scripts/preflight-audit.sh dist/
#
# 敏感串放在本地私有文件里（PATTERNS_FILE，一行一个，绝不提交仓库），
# 这样仓库本身不含任何真实 IP / QQ / 邮箱 / 授权码，审计规则也不泄露。

set -uo pipefail

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  echo "用法: $0 <目录或zip>..." >&2
  exit 2
fi

patterns_file="${PATTERNS_FILE:-}"
tmp=""
cleanup () { [ -n "$tmp" ] && rm -rf "$tmp"; }
trap cleanup EXIT

if [ -z "$patterns_file" ] || [ ! -f "$patterns_file" ]; then
  echo "缺少 PATTERNS_FILE（本地私有敏感串清单，一行一个）" >&2
  exit 2
fi

# 至少要有内容，避免空文件导致"审计通过"的假象
if ! grep -qvE '^\s*(#|$)' "$patterns_file"; then
  echo "PATTERNS_FILE 为空，拒绝审计" >&2
  exit 2
fi

status=0
for t in "${targets[@]}"; do
  if [ -d "$t" ]; then
    dir="$t"
  elif [ -f "$t" ]; then
    tmp="${tmp:-$(mktemp -d)}"
    name="$(basename "$t")"
    case "$name" in
      *.zip) unzip -q -o "$t" -d "$tmp/$name" || exit 2; dir="$tmp/$name" ;;
      *.tar.gz|*.tgz) mkdir -p "$tmp/$name" && tar xzf "$t" -C "$tmp/$name" || exit 2; dir="$tmp/$name" ;;
      *) dir=""; ;;
    esac
    if [ -z "$dir" ]; then echo "不支持的包类型: $t" >&2; exit 2; fi
  else
    echo "找不到: $t" >&2
    exit 2
  fi

  hits="$(grep -rIlF -f <(grep -vE '^\s*(#|$)' "$patterns_file") "$dir" 2>/dev/null)"
  if [ -n "$hits" ]; then
    echo "✗ 敏感串命中（$t）：" >&2
    echo "$hits" | sed 's|^|  |' >&2
    status=1
  else
    echo "✓ 无命中: $t"
  fi

  # 调试残留
  leftovers="$(find "$dir" -name '*.bak-*' -o -name '*.orig-*' -o -name '*.log' 2>/dev/null | head -20)"
  if [ -n "$leftovers" ]; then
    echo "✗ 发现调试残留（$t）：" >&2
    echo "$leftovers" | sed 's|^|  |' >&2
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "审计未通过，禁止上传。" >&2
fi
exit "$status"
