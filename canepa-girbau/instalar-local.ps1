# ──────────────────────────────────────────────────────────────────────────────
#  Canepa & Girbau · instalación local en Windows (PowerShell)
#
#  1. Clona la web (con su historial) en $HOME\canepa-girbau-web
#  2. Descarga las imágenes y vídeos de Higgsfield a assets\media
#  3. Crea tu repositorio propio en GitHub y sube todo (opcional)
#  4. Arranca la web en http://localhost:3000 y abre el navegador
#
#  Uso (desde la carpeta donde guardaste este archivo):
#    powershell -ExecutionPolicy Bypass -File .\instalar-local.ps1
#  Volver a ejecutarlo es seguro: actualiza en vez de reinstalar.
# ──────────────────────────────────────────────────────────────────────────────
param(
  [string]$Dest = (Join-Path $HOME 'canepa-girbau-web'),
  [int]$Port = 3000,
  [switch]$SkipAssets,
  [switch]$NoServe
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest es mucho más rápido sin barra
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SrcRepo   = 'https://github.com/denzelot/combo2048.git'
$SrcBranch = 'canepa-girbau-standalone'
$NewRepo   = 'canepa-girbau-web'
$Hosts     = 'd8j0ntlcm91z4\.cloudfront\.net|d2ol7oe51mr4n9\.cloudfront\.net'

function Say($msg) { Write-Host "`n> $msg" -ForegroundColor Yellow }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Git-Run {
  & git @args
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') falló (código $LASTEXITCODE)" }
}
function Ensure-Tool($cmd, $wingetId, $manual) {
  if (Has $cmd) { return }
  if (Has winget) {
    Say "Instalando $cmd con winget…"
    winget install --id $wingetId -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  }
  if (-not (Has $cmd)) { throw "Falta $cmd. Instálalo desde $manual y vuelve a ejecutar este script." }
}

Ensure-Tool 'git' 'Git.Git' 'https://git-scm.com/download/win'

# ── 1. Código ────────────────────────────────────────────────────────────────
if (Test-Path (Join-Path $Dest '.git')) {
  Say "1/4 La web ya está en $Dest — trayendo cambios"
  & git -C $Dest pull --ff-only
  if ($LASTEXITCODE -ne 0) { Write-Host "  (no se pudo actualizar automáticamente; revisa 'git status')" }
} else {
  Say "1/4 Clonando la web en $Dest"
  Git-Run clone --branch $SrcBranch --single-branch $SrcRepo $Dest
  Git-Run -C $Dest branch -m $SrcBranch main
  Git-Run -C $Dest remote rename origin combo2048
}
Set-Location $Dest
& git config user.name  *> $null; if ($LASTEXITCODE -ne 0) { git config user.name  'Canepa & Girbau' }
& git config user.email *> $null; if ($LASTEXITCODE -ne 0) { git config user.email 'hola@canepagirbau.pe' }

# ── 2. Imágenes y vídeos ─────────────────────────────────────────────────────
if (-not $SkipAssets) {
  Say '2/4 Descargando imágenes y vídeos de Higgsfield (puede tardar unos minutos)'
  $indexPath = Join-Path $Dest 'index.html'
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  $html = [IO.File]::ReadAllText($indexPath, $utf8)
  $urls = [regex]::Matches($html, "https://($Hosts)/[^`"]+") | ForEach-Object { $_.Value } | Sort-Object -Unique
  if ($urls) {
    $media = Join-Path $Dest 'assets\media'
    New-Item -ItemType Directory -Force -Path $media | Out-Null
    $i = 0
    foreach ($u in $urls) {
      $i++
      $name = ($u -split '/')[-1]
      $file = Join-Path $media $name
      if (-not (Test-Path $file) -or (Get-Item $file).Length -eq 0) {
        Write-Host "  [$i/$($urls.Count)] $name"
        Invoke-WebRequest -Uri $u -OutFile "$file.part" -UseBasicParsing
        Move-Item -Force "$file.part" $file
      }
    }
    $html = [regex]::Replace($html, "https://(?:$Hosts)/[^`"]*/([^`"/]+)", 'assets/media/$1')
    $html = [regex]::Replace($html, "\r?\n[ \t]*<link rel=`"preconnect`" href=`"https://(?:$Hosts)`"[^>]*>", '')
    [IO.File]::WriteAllText($indexPath, $html, $utf8)
    $mb = [math]::Round(((Get-ChildItem $media | Measure-Object Length -Sum).Sum / 1MB), 1)
    Write-Host "  Listo: $($urls.Count) archivos, $mb MB en assets\media"
  } else {
    Write-Host '  index.html ya usa archivos locales.'
  }
  if (git status --porcelain) {
    Git-Run add -A
    Git-Run commit -q -m 'Serve Higgsfield media locally from assets/media'
    Write-Host '  Guardado en git.'
  }
}

# ── 3. Repositorio propio en GitHub ──────────────────────────────────────────
Say "3/4 Repositorio propio en GitHub ($NewRepo)"
& git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) {
  Git-Run push -u origin main
} else {
  $ghReady = $false
  if (Has gh) { & gh auth status *> $null; $ghReady = ($LASTEXITCODE -eq 0) }
  if ($ghReady) {
    & gh repo create $NewRepo --private --source . --remote origin --push
  } else {
    Write-Host '  Para tener la web en su propio repositorio:'
    Write-Host "   a) Crea un repositorio VACÍO llamado $NewRepo en https://github.com/new"
    Write-Host '      (privado, sin README ni .gitignore).'
    $url = Read-Host '   b) Pega aquí su URL (o Enter para saltar este paso)'
    if ($url) {
      Git-Run remote add origin $url
      Git-Run push -u origin main
    } else {
      Write-Host '  Saltado. Puedes volver a ejecutar este script cuando lo tengas.'
    }
  }
}

# ── 4. Servidor local ────────────────────────────────────────────────────────
if ($NoServe) { Say "Listo en $Dest"; return }
if (-not (Has npx) -and -not (Has python)) { Ensure-Tool 'npx' 'OpenJS.NodeJS.LTS' 'https://nodejs.org' }
$url = "http://localhost:$Port"
Say "4/4 Web funcionando en $url  (Ctrl+C para detener)"
Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 3; Start-Process $u } -ArgumentList $url | Out-Null
if (Has npx) { & npx -y serve -l $Port . } else { & python -m http.server $Port }
