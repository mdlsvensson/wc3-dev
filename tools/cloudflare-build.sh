#!/bin/sh
set -eu

case "${1-}" in
  home|docs) app="$1" ;;
  *) echo 'Expected app: home or docs' >&2; exit 2 ;;
esac
if [ "$(uname -s)" != Linux ] || [ "$(uname -m)" != x86_64 ]; then
  echo 'Cloudflare bootstrap requires Linux/x86_64' >&2
  exit 2
fi

version=2.9.7
checksum=c6527f24f4b16031d3ae4fa9f658d5f11534c8d84ce7dc8502420280919c3490
mkdir -p .build-tools
curl -fL --retry 3 -o .build-tools/deno.zip \
  "https://github.com/denoland/deno/releases/download/v$version/deno-x86_64-unknown-linux-gnu.zip"
printf '%s  %s\n' "$checksum" '.build-tools/deno.zip' | sha256sum -c -
unzip -oq .build-tools/deno.zip -d .build-tools
.build-tools/deno install --frozen --allow-scripts
.build-tools/deno task "build:$app"
