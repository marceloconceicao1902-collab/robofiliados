# Fluxo: 3 CLI AUTH OFICIAIS (OAuth via browser/8-digit-code) -> captura tokens -> deploy Vercel + Firebase.
#
# RODAR FORA DO SANDBOX (PowerShell normal) para evitar writes em %APPDATA%.
#
# Usage:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\scripts\auth-cli-deploy.ps1

[CmdletBinding()]
param(
  [string]$GithubOwner      = "marceloconceicao1902-collab",
  [string]$GithubRepo       = "robofiliados",
  [string]$VercelProject    = "robofiliados",
  [string]$FirebaseProjId   = "robofiliados-$([DateTime]::Now.ToString('yyMMdd'))",
  [string]$FirebaseProjName = "Robo Filiados ML Shoppe",
  [string]$GitSSD           = "C:\Users\marce\AppData\Local\Temp\affiliate-git.git",
  [string]$NodeModulesPath  = "C:\Users\marce\AppData\Local\Temp\affiliate-install\node_modules"
)

$PROJ_DIR = Split-Path -Parent $PSScriptRoot
Set-Location $PROJ_DIR

$TC = Join-Path $PROJ_DIR ".tool-configs"
New-Item -ItemType Directory -Force -Path (Join-Path $TC "gh") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TC "vercel-global") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TC "firebase") | Out-Null
New-Item -ItemType Directory -Force -Path "C:\Users\marce\AppData\Local\Temp\npm-cache" | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TC "xdg") | Out-Null

$env:GH_CONFIG_DIR             = Join-Path $TC "gh"
$env:VERCEL_TELEMETRY_DISABLED = "1"
$env:FIREBASE_CLI_DISABLE_ANALYTICS = "true"
$env:VERCEL_CONFIG_DIR         = Join-Path $TC "vercel-global"
$env:npm_config_cache          = "C:\Users\marce\AppData\Local\Temp\npm-cache"
$env:npm_config_update_notifier = "false"
$env:ADOTDIR                   = Join-Path $TC "xdg"
$env:XDG_CONFIG_HOME           = $env:ADOTDIR
$env:XDG_DATA_HOME             = $env:ADOTDIR

function Write-Step($m) { Write-Host ""; Write-Host ("==> " + $m) -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host ("    [OK] " + $m) -ForegroundColor Green }
function Write-Warn($m) { Write-Host ("    [WARN] " + $m) -ForegroundColor Yellow }
function Fail($m)       { Write-Host ("    [FAIL] " + $m) -ForegroundColor Red; exit 1 }
function g {
  param([Parameter(ValueFromRemainingArguments=$true)]$a)
  git --git-dir=$GitSSD --work-tree=$PROJ_DIR @a
}

Write-Step "1/3. GitHub AUTH CLI (gh auth login --web scope=repo)"
Write-Host "    URL backup: https://github.com/login/device"
Write-Host ""
gh auth login --hostname github.com --git-protocol https --scopes repo --web --insecure-storage 2>&1 | Tee-Object -Variable ghOut
Write-Host ""

try {
  $ghToken = (& gh auth token --hostname github.com 2>$null).Trim()
  if ($ghToken -and $ghToken.Length -gt 20) {
    $env:GITHUB_TOKEN = $ghToken
    Write-Ok ("GitHub token OK (length=" + $ghToken.Length + ")")
  } else {
    Write-Warn "gh auth token vazio. Cole o token manualmente:"
    $env:GITHUB_TOKEN = (Read-Host "GITHUB_TOKEN").Trim()
  }
} catch {
  Write-Warn ("erro extraindo GH token: " + $_)
  $env:GITHUB_TOKEN = (Read-Host "Cole GITHUB_TOKEN manual").Trim()
}

Write-Step "2/3. Vercel AUTH CLI (vercel login --global-config)"
vercel login --global-config (Join-Path $TC "vercel-global") 2>&1 | Tee-Object -Variable vercelOut
Write-Host ""

$vercelToken = ""
Get-ChildItem (Join-Path $TC "vercel-global") -File -Recurse -Filter *.json -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    $c = Get-Content $_.FullName -Raw
    if ($c -match '"token"\s*:\s*"([A-Za-z0-9_\-]{20,})"') { $vercelToken = $matches[1] }
  } catch {}
}
if ($vercelToken -and $vercelToken.Length -gt 20) {
  $env:VERCEL_TOKEN = $vercelToken
  Write-Ok ("Vercel token OK (length=" + $vercelToken.Length + ")")
} else {
  Write-Warn "Nao foi possivel extrair token Vercel. Cole manualmente:"
  $env:VERCEL_TOKEN = (Read-Host "VERCEL_TOKEN").Trim()
}

Write-Step "3/3. Firebase AUTH CLI (npx firebase-tools login:ci)"
Write-Host "    Abre navegador Google -> faca login -> volte e copie o token impresso (1//0...)"
Write-Host ""
$fbOut = (& npx --yes firebase-tools login:ci --no-localhost 2>&1)
$fbOut | ForEach-Object { Write-Host ("    " + $_) }
Write-Host ""
$fbToken = ""
$fbOut -join "`n" | ForEach-Object {
  if ($_ -match '(1//[0-9A-Za-z_\-]{10,}|1/[0-9A-Za-z_\-]{10,})') { $fbToken = $matches[0] }
}
if (-not $fbToken -or $fbToken.Length -lt 25) {
  Write-Warn "Regex nao achou token Firebase."
  $env:FIREBASE_TOKEN = (Read-Host "Cole FIREBASE_TOKEN (1//0...)").Trim()
} else {
  $env:FIREBASE_TOKEN = $fbToken
  Write-Ok ("Firebase CI token OK (length=" + $fbToken.Length + ")")
}

Write-Step "Validacao final dos 3 TOKENS:"
$ok = $true
if (-not $env:GITHUB_TOKEN -or $env:GITHUB_TOKEN.Length -lt 20) { Write-Warn "GITHUB_TOKEN vazio"; $ok = $false } else { Write-Ok ("GITHUB_TOKEN (" + $env:GITHUB_TOKEN.Length + " chars)") }
if (-not $env:VERCEL_TOKEN -or $env:VERCEL_TOKEN.Length -lt 20)   { Write-Warn "VERCEL_TOKEN vazio";   $ok = $false } else { Write-Ok ("VERCEL_TOKEN (" + $env:VERCEL_TOKEN.Length + " chars)") }
if (-not $env:FIREBASE_TOKEN -or $env:FIREBASE_TOKEN.Length -lt 20){ Write-Warn "FIREBASE_TOKEN vazio"; $ok = $false } else { Write-Ok ("FIREBASE_TOKEN (" + $env:FIREBASE_TOKEN.Length + " chars)") }
if (-not $ok) { Fail "Algum token faltando. Abortando." }

Write-Step "Chamando scripts/deploy-tokens.ps1 (GitHub verify + Vercel --prod + Firebase deploy)"
$dt = Join-Path $PSScriptRoot "deploy-tokens.ps1"
& $dt -GithubOwner $GithubOwner -GithubRepo $GithubRepo -VercelProject $VercelProject -FirebaseProjId $FirebaseProjId -FirebaseProjName $FirebaseProjName -GitSSD $GitSSD -NodeModulesPath $NodeModulesPath

Write-Step "FIM. AUTH + DEPLOY CONCLUIDOS."
