#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  Canepa & Girbau · instalación local en un solo paso
#
#  1. Clona la web (con su historial) en ~/canepa-girbau-web
#  2. Descarga las imágenes y vídeos de Higgsfield a assets/media
#  3. Crea tu repositorio propio en GitHub y sube todo (si tienes GitHub CLI)
#  4. Arranca la web en http://localhost:3000
#
#  Uso:   bash instalar-local.sh [carpeta-destino]
#  Windows: ejecútalo desde "Git Bash".
#  Volver a ejecutarlo es seguro: actualiza en vez de reinstalar.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEST="${1:-$HOME/canepa-girbau-web}"
SRC_REPO="https://github.com/denzelot/combo2048.git"
SRC_BRANCH="canepa-girbau-standalone"
NEW_REPO="canepa-girbau-web"
PORT="${PORT:-3000}"

say()  { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta '$1'. $2"; exit 1; }; }
need git  "Instálalo desde https://git-scm.com"
need curl "Instálalo con el gestor de paquetes de tu sistema."

# ── 1. Código ────────────────────────────────────────────────────────────────
if [ -d "$DEST/.git" ]; then
  say "1/4 La web ya está en $DEST — trayendo cambios"
  git -C "$DEST" pull --ff-only || echo "  (no se pudo actualizar automáticamente; revisa 'git status')"
else
  say "1/4 Clonando la web en $DEST"
  git clone --branch "$SRC_BRANCH" --single-branch "$SRC_REPO" "$DEST"
  git -C "$DEST" branch -m "$SRC_BRANCH" main
  git -C "$DEST" remote rename origin combo2048
fi
cd "$DEST"
git config user.name  >/dev/null 2>&1 || git config user.name  "Canepa & Girbau"
git config user.email >/dev/null 2>&1 || git config user.email "hola@canepagirbau.pe"

# ── 2. Imágenes y vídeos ─────────────────────────────────────────────────────
if [ "${SKIP_ASSETS:-0}" != "1" ]; then
  say "2/4 Descargando imágenes y vídeos de Higgsfield (puede tardar unos minutos)"
  bash download-assets.sh
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -q -m "Serve Higgsfield media locally from assets/media"
    echo "  Guardado en git."
  fi
fi

# ── 3. Repositorio propio en GitHub ──────────────────────────────────────────
say "3/4 Repositorio propio en GitHub ($NEW_REPO)"
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh repo create "$NEW_REPO" --private --source . --remote origin --push
else
  echo "  No encontré GitHub CLI (gh) con sesión iniciada. Hazlo a mano:"
  echo "   a) Crea un repositorio VACÍO llamado $NEW_REPO en https://github.com/new"
  echo "      (privado, sin README ni .gitignore)."
  url=""
  read -r -p "   b) Pega aquí su URL (o Enter para saltar este paso): " url || true
  if [ -n "$url" ]; then
    git remote add origin "$url"
    git push -u origin main
  else
    echo "  Saltado. Puedes volver a ejecutar este script cuando lo tengas."
  fi
fi

# ── 4. Servidor local ────────────────────────────────────────────────────────
[ "${NO_SERVE:-0}" = "1" ] && { say "Listo en $DEST"; exit 0; }
URL="http://localhost:$PORT"
say "4/4 Web funcionando en $URL  (Ctrl+C para detener)"
( sleep 2
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v start >/dev/null 2>&1; then start "$URL"; fi ) >/dev/null 2>&1 &
if command -v npx >/dev/null 2>&1; then
  npx -y serve -l "$PORT" .
elif command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
else
  python -m http.server "$PORT"
fi
