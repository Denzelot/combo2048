#!/usr/bin/env bash
# Descarga las imágenes y vídeos generados en Higgsfield a ./assets y
# reescribe index.html para servirlos localmente (recomendado para producción).
# Uso: bash download-assets.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets
grep -oE 'https://d8j0ntlcm91z4\.cloudfront\.net/[^"]+' index.html | sort -u | while read -r url; do
  f="assets/$(basename "$url")"
  [ -f "$f" ] || { echo "↓ $f"; curl -fsSL "$url" -o "$f"; }
done
# Opcional: convierte PNG pesados a WebP si está instalado cwebp
if command -v cwebp >/dev/null; then
  for p in assets/*.png; do w="${p%.png}.webp"; [ -f "$w" ] || cwebp -quiet -q 82 "$p" -o "$w"; done
  sed -i.bak -E 's#https://d8j0ntlcm91z4\.cloudfront\.net/[^"]*/([^"/]+)\.png#assets/\1.webp#g' index.html
fi
sed -i.bak -E 's#https://d8j0ntlcm91z4\.cloudfront\.net/[^"]*/([^"/]+)#assets/\1#g' index.html
rm -f index.html.bak
echo "Listo: index.html ahora usa ./assets"
