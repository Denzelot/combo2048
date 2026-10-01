#!/usr/bin/env bash
# Descarga las imágenes y vídeos generados en Higgsfield a ./assets/media y
# reescribe index.html para servirlos localmente (sin depender del CDN).
# Es seguro ejecutarlo varias veces: solo baja lo que falte.
# Uso: bash download-assets.sh
set -euo pipefail
cd "$(dirname "$0")"
HOSTS='d8j0ntlcm91z4\.cloudfront\.net|d2ol7oe51mr4n9\.cloudfront\.net'
mkdir -p assets/media

urls=$(grep -oE "https://($HOSTS)/[^\"]+" index.html | sort -u || true)
if [ -z "$urls" ]; then echo "index.html ya usa archivos locales."; exit 0; fi

n=0; total=$(printf '%s\n' "$urls" | wc -l | tr -d ' ')
while read -r url; do
  n=$((n + 1))
  f="assets/media/$(basename "$url")"
  if [ ! -s "$f" ]; then
    echo "↓ [$n/$total] $(basename "$url")"
    curl -fSL --retry 3 --progress-bar "$url" -o "$f.part" && mv "$f.part" "$f"
  fi
done <<< "$urls"

# Opcional: PNG pesados → WebP (mucho más ligeros) si está instalado cwebp
if command -v cwebp >/dev/null; then
  for p in assets/media/*.png; do
    [ -e "$p" ] || continue
    w="${p%.png}.webp"; [ -f "$w" ] || cwebp -quiet -q 84 -alpha_q 90 "$p" -o "$w"
  done
  sed -i.bak -E "s#https://($HOSTS)/[^\"]*/([^\"/]+)\.png#assets/media/\2.webp#g" index.html
fi
sed -i.bak -E "s#https://($HOSTS)/[^\"]*/([^\"/]+)#assets/media/\2#g" index.html
# el preconnect al CDN ya no hace falta
sed -i.bak -E "/rel=\"preconnect\" href=\"https:\/\/($HOSTS)\"/d" index.html
rm -f index.html.bak
echo "Listo: index.html usa ./assets/media ($(du -sh assets/media | cut -f1))."
