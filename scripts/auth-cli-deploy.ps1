# Fluxo: 3 CLI AUTH OFICIAIS (OAuth via browser/8-digit-code) -> captura tokens -> deploy Vercel + Firebase.
#
# RODAR FORA DO SANDBOX (melhor) OU DENTRO (com .tool-configs/ local).
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

# -------- EVITA SANDBOX BLOCKS: todos os caches/configs locais dentro de .tool-configs --------
$TC = Join-Path $PROJ_DIR ".tool-configs"
New-Item -ItemType Directory -Force -Path (Join-Path $TC "gh") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TC "vercel") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TC "firebase") | Out-Null
New-Item -ItemType Directory -Force -Path "C:\Users\marce\AppData\Local\Temp\npm-cache" | Out-Null

$env:GH_CONFIG_DIR         = Join-Path $TC "gh"
$env:VERCEL_CONFIG_DIR     = Join-Path $TC "vercel"
$env:FIREBASE_CONFIG_DIR   = Join-Path $TC "firebase"
$env:npm_config_cache      = "C:\Users\marce\AppData\Local\Temp\npm-cache"
$env:npm_config_update_notifier = "false"
$env:ADOTDIR               = Join-Path $TC "xdg"   # evita %APPDATA%\xdg.data

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "    ✅ $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "    ⚠️  $m" -ForegroundColor Yellow }
function Fail($m)       { Write-Host "    ❌ $m" -ForegroundColor Red; exit 1 }
function g {
  param([Parameter(ValueFromRemainingArguments=$true)]$a)
  git --git-dir=$GitSSD --work-tree=$PROJ_DIR @a
}

# =====================================================================
# ETAPA 1 - GitHub CLI AUTH (gh auth login com código de 8 dígitos)
# =====================================================================
Write-Step "1/3. GitHub AUTH CLI (gh auth login --web scope=repo)"
Write-Host "    Abra a URL abaixo no navegador, logue e cole o CODIGO DE 8 DIGITOS exibido no terminal:"
Write-Host "    URL: https://github.com/login/device"
Write-Host ""
gh auth login --hostname github.com --git-protocol https --scopes repo --web 2>&1 | Tee-Object -Variable ghOut
Write-Host ""

try {
  $ghToken = & gh auth token --hostname github.com 2>$null
  if ($ghToken -and $ghToken.Length -gt 20) {
    $env:GITHUB_TOKEN = $ghToken
    Write-Ok "GitHub token OK (length=$($ghToken.Length))"
  } else {
    Write-Warn "gh auth token vazio. Tente rodar: gh auth refresh -s repo"
    Write-Host "    -> Cole o token manualmente neste terminal:"
    $env:GITHUB_TOKEN = (Read-Host "GITHUB_TOKEN").Trim()
  }
} catch {
  Write-Warn "erro extraindo GH token: $_"
  $env:GITHUB_TOKEN = (Read-Host "Cole GITHUB_TOKEN manual").Trim()
}

# =====================================================================
# ETAPA 2 - Vercel AUTH (vercel login)
# =====================================================================
Write-Step "2/3. Vercel AUTH CLI (vercel login --interactive)"
vercel login --interactive 2>&1 | Tee-Object -Variable vercelOut
Write-Host ""

# tenta ler o token do $VERCEL_CONFIG_DIR/auth.json ou config.json
$tokenPath = Join-Path $env:VERCEL_CONFIG_DIR "auth.json"
$alt1 = Join-Path $env:VERCEL_CONFIG_DIR "config.json"
$alt2 = Join-Path $env:VERCEL_CONFIG_DIR ".."
$vercelToken = ""
foreach ($f in @($tokenPath,$alt1)) {
  if (Test-Path $f) {
    try {
      $j = Get-Content $f -Raw | ConvertFrom-Json
      if ($j.token)             { $vercelToken = $j.token.ToString(); break }
      if ($j -and $j[0] -and $j[0].token) { $vercelToken = $j[0].token.ToString(); break }
      if ($j.defaultTeamId -and $j.token -eq $null) {
        # procurar em files embaixo
        Get-ChildItem $env:VERCEL_CONFIG_DIR -File -Recurse | ForEach-Object {
          try {
            $c = Get-Content $_.FullName -Raw
            if ($c -match '"token"\s*:\s*"([A-Za-z0-9_\-]{20,})"') { $vercelToken = $matches[1] }
          } catch {}
        }
      }
    } catch {}
  }
}
if (-not $vercelToken) {
  $allJsons = Get-ChildItem $env:VERCEL_CONFIG_DIR -File -Recurse -Filter *.json 2>$null
  foreach ($f in $allJsons) {
    try {
      $c = Get-Content $f.FullName -Raw
      if ($c -match '"token"\s*:\s*"([^\"]{20,})"') { $vercelToken = $matches[1]; break }
    } catch {}
  }
}
if ($vercelToken -and $vercelToken.Length -gt 20) {
  $env:VERCEL_TOKEN = $vercelToken
  Write-Ok "Vercel token OK (length=$($vercelToken.Length)). Arquivo config VERCEL_CONFIG_DIR=$env:VERCEL_CONFIG_DIR"
} else {
  Write-Warn "Nao foi possivel extrair token Vercel do arquivo. Cole manualmente:"
  $env:VERCEL_TOKEN = (Read-Host "VERCEL_TOKEN").Trim()
}

# =====================================================================
# ETAPA 3 - Firebase AUTH (firebase login:ci — IMPRIME TOKEN NO STDOUT)
# =====================================================================
Write-Step "3/3. Firebase AUTH CLI (npx firebase-tools login:ci)"
Write-Host "    Vai abrir navegador Google -> faca login -> VOLTE AO TERMINAL e COPIE/COLE o token impresso:"
Write-Host "    (o token comeca com 1//0 ou 1/ e tem muitos caracteres)"
Write-Host ""

$fbOut = (npx --yes firebase-tools login:ci --no-localhost 2>&1)
$fbOut | ForEach-Object { Write-Host "    $_" }
Write-Host ""

# Regex captura o token de CI do Firebase (nao tem espacos, comeca com 1//0 ou 1/)
$fbToken = ""
$fbOut -join "`n" | ForEach-Object {
  if ($_ -match '(1//[0-9A-Za-z_\-]{10,}|1/[0-9A-Za-z_\-]{10,})') { $fbToken = $matches[0] }
}
if (-not $fbToken -or $fbToken.Length -lt 30) {
  Write-Warn "Regex nao achou token Firebase no stdout."
  $env:FIREBASE_TOKEN = (Read-Host "Cole FIREBASE_TOKEN (inteiro, sem espacos)").Trim()
} else {
  $env:FIREBASE_TOKEN = $fbToken
  Write-Ok "Firebase CI token OK (length=$($fbToken.Length))"
}

# =====================================================================
# ETAPA 4 - VALIDACAO
# =====================================================================
Write-Step "Validacao final dos 3 TOKENS:"
$ok = $true
if (-not $env:GITHUB_TOKEN -or $env:GITHUB_TOKEN.Length -lt 20) { Write-Warn "GITHUB_TOKEN vazio ou curto"; $ok = $false } else { Write-Ok "GITHUB_TOKEN ($($env:GITHUB_TOKEN.Length) chars)" }
if (-not $env:VERCEL_TOKEN -or $env:VERCEL_TOKEN.Length -lt 20)   { Write-Warn "VERCEL_TOKEN vazio ou curto";   $ok = $false } else { Write-Ok "VERCEL_TOKEN ($($env:VERCEL_TOKEN.Length) chars)" }
if (-not $env:FIREBASE_TOKEN -or $env:FIREBASE_TOKEN.Length -lt 20){ Write-Warn "FIREBASE_TOKEN vazio ou curto"; $ok = $false } else { Write-Ok "FIREBASE_TOKEN ($($env:FIREBASE_TOKEN.Length) chars)" }

if (-not $ok) { Fail "Algum token faltando. Abortando." }

# =====================================================================
# ETAPA 5 - Chamar deploy-tokens.ps1 (mesmo script do guia tokens dashboard)
# =====================================================================
Write-Step "Chamando scripts\deploy-tokens.ps1 (GitHub verify + Vercel --prod + Firebase deploy functions+firestore)"
$dt = Join-Path $PSScriptRoot "deploy-tokens.ps1"
& $dt -GithubOwner $GithubOwner -GithubRepo $GithubRepo -VercelProject $VercelProject -FirebaseProjId $FirebaseProjId -FirebaseProjName $FirebaseProjName -GitSSD $GitSSD -NodeModulesPath $NodeModulesPath

Write-Step "FIM. AUTH + DEPLOY CONCLUIDOS."
