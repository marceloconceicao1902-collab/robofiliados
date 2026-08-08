# Requer: PowerShell 5+; Execute como:
#   cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\scripts\deploy-setup.ps1

[CmdletBinding()]
param(
  [string]$GhRepoName = "affiliate-bot-ml-shoppe",
  [string]$VercelProjectName = "affiliate-bot-ml-shoppe",
  [string]$FirebaseProjectId = "affiliate-bot-ml-shoppe-$([DateTime]::Now.ToString('yyMMdd'))",
  [string]$FirebaseDisplayName = "Affiliate Bot ML Shoppe Promotions",
  [switch]$SkipGh,
  [switch]$SkipVercel,
  [switch]$SkipFirebase
)

$ErrorActionPreference = 'Continue'
$PROJ_DIR = Split-Path -Parent $PSScriptRoot
$GIT_SSD  = "C:\Users\marce\AppData\Local\Temp\affiliate-git.git"
$NODE_MOD = "C:\Users\marce\AppData\Local\Temp\affiliate-install\node_modules"

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    ⚠️  $msg" -ForegroundColor Yellow }
function Fail($msg)       { Write-Host "    ❌ $msg" -ForegroundColor Red; exit 1 }

function g {
  if (-not (Test-Path $GIT_SSD)) { Fail "Git bare repo nao encontrado em $GIT_SSD. Restaure." }
  git --git-dir=$GIT_SSD --work-tree=$PROJ_DIR @args
}

# ------------- PRE-FLIGHT: Autenticacao -------------
Write-Step "Autenticacao / CLIs disponiveis"
function Test-CLI($name, $cmd) {
  $bin = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($bin) { Write-Ok "$name CLI -> $($bin.Source)" } else { Write-Warn "$name CLI NAO encontrado (instale: winget install GitHub.cli / scoop / npm i -g firebase-tools)" }
}
Test-CLI "git"     "git"
Test-CLI "gh"      "gh"
Test-CLI "vercel"  "vercel"
Test-CLI "firebase (npx)" "npx"

# ------------- 1. GitHub -------------
if (-not $SkipGh) {
  Write-Step "1. GitHub: verificar auth + criar repo"
  $ghAuth = (& gh auth status 2>&1) -join "`n"
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "gh NAO logado. Rodando 'gh auth login' (interativo browser)."
    gh auth login
    if ($LASTEXITCODE -ne 0) { Fail "gh auth login falhou. Tente manualmente e rode o script de novo." }
  }
  Write-Ok "gh logado"

  $repoList = (& gh repo list --limit 200 2>&1) -join "`n"
  if ($repoList -match "(^|\s)$GhRepoName(\s|$|/)" -or $repoList -match "/$GhRepoName\b") {
    Write-Ok "Repo '$GhRepoName' ja existe no GitHub"
  } else {
    Write-Host "    Criando repo private '$GhRepoName'..."
    gh repo create $GhRepoName --private --description "Bot Promocoes WhatsApp Afiliados Shopee Mercado Livre" -y
    if ($LASTEXITCODE -ne 0) { Fail "gh repo create falhou" }
    Write-Ok "Repo criado: https://github.com/`$USER/$GhRepoName"
  }

  $remote = g remote get-url origin 2>$null
  if (-not $remote) {
    $ghUser = (gh api user --jq .login 2>$null)
    if (-not $ghUser) { $ghUser = Read-Host "   Digite seu usuario GitHub" }
    g remote add origin "https://github.com/$ghUser/$GhRepoName.git"
    Write-Ok "origin adicionado -> https://github.com/$ghUser/$GhRepoName"
  }
  g branch -M main
  Write-Host "    Push para origin/main..."
  g push -u origin main
  if ($LASTEXITCODE -ne 0) { Fail "git push falhou" }
  Write-Ok "GitHub push OK"
}

# ------------- 2. Vercel -------------
if (-not $SkipVercel) {
  Write-Step "2. Vercel: project add + env vars + deploy prod"
  $who = (& vercel whoami 2>&1) -join "`n"
  if ($LASTEXITCODE -ne 0 -or $who -match '^No$') {
    Write-Warn "Vercel NAO logado. Rodando 'vercel login' (browser)."
    vercel login
    if ($LASTEXITCODE -ne 0) { Fail "vercel login falhou" }
  }
  Write-Ok "Vercel logado: $who"

  Push-Location $PROJ_DIR
    $vf = Join-Path $PROJ_DIR ".vercel\project.json"
    if (-not (Test-Path $vf)) {
      Write-Host "    Linkando projeto '$VercelProjectName'..."
      vercel link --yes --project=$VercelProjectName --scope=$env:USERNAME 2>&1 | Select-Object -Last 3
    }

    $vars = @{
      "NODE_ENV"                  = "production"
      "PORT"                      = "80"
      "SHOPEE_AFFILIATE_TAG"      = "SEU_SHOPEE_TAG_AQUI"
      "ML_AFFILIATE_TAG"          = "SEU_ML_ID_AQUI"
      "WHATSAPP_PROVIDER"         = "evolution"
      "SEND_MIN_DELAY"            = "30000"
      "SEND_MAX_DELAY"            = "90000"
      "SEND_MAX_PER_HOUR"         = "200"
      "SEND_CAMPAIGN_INTERVAL"    = "0 */15 * * * *"
      "ANTI_DUPLICATE_WINDOW_HOURS" = "24"
      "DATABASE_URL"              = "file:./prod.db"
      "REDIS_URL"                 = ""
      "EVOLUTION_API_URL"         = "https://evo.seudominio.com/message/sendText"
      "EVOLUTION_API_INSTANCE"    = "bot1"
      "EVOLUTION_API_TOKEN"       = "SEU_TOKEN_EVO"
    }
    foreach ($kv in $vars.GetEnumerator()) {
      Write-Host "    env $($kv.Key) = $($kv.Value)"
      $out = (echo $kv.Value | vercel env add $kv.Key production --yes 2>&1) -join " "
      if ($LASTEXITCODE -ne 0) { Write-Warn "env $($kv.Key) pode ja existir; continuando" }
    }

    Write-Host "    Deploy producao..."
    vercel --prod --yes
    if ($LASTEXITCODE -ne 0) { Fail "vercel --prod falhou" }
  Pop-Location
  Write-Ok "Vercel deploy produzido OK"
}

# ------------- 3. Firebase Functions -------------
if (-not $SkipFirebase) {
  Write-Step "3. Firebase Functions: build functions + criar projeto + deploy"
  Push-Location (Join-Path $PROJ_DIR "functions")
    Write-Host "    Install functions deps..."
    $env:NODE_PATH = $NODE_MOD
    if (-not (Test-Path "node_modules")) {
      npm install --include=dev --legacy-peer-deps --force
    }
    Write-Host "    Build TS -> lib/index.js..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "functions build TS falhou" }
  Pop-Location

  Push-Location $PROJ_DIR
    $fb = "npx --yes firebase-tools"
    $logged = (Invoke-Expression "$fb login:list 2>&1") -join "`n"
    if ($LASTEXITCODE -ne 0 -or $logged.Length -lt 4) {
      Write-Warn "Firebase NAO logado. Rodando login (browser)."
      Invoke-Expression "$fb login"
      if ($LASTEXITCODE -ne 0) { Fail "firebase login falhou" }
    }

    Write-Host "    Criando projeto Firebase GCP ID='$FirebaseProjectId'..."
    $list = (Invoke-Expression "$fb projects:list 2>&1") -join "`n"
    if ($list -match [regex]::Escape($FirebaseProjectId)) {
      Write-Ok "Projeto Firebase '$FirebaseProjectId' ja existe"
    } else {
      Invoke-Expression "$fb projects:create '$FirebaseProjectId' --display-name='$FirebaseDisplayName' --no-color"
      if ($LASTEXITCODE -ne 0) { Fail "firebase projects:create falhou. Tente outro PROJECT ID (globalmente unico)." }
    }
    Invoke-Expression "$fb use '$FirebaseProjectId' --add"
    Write-Host "    Deploy functions + firestore.rules..."
    Invoke-Expression "$fb deploy --only functions,firestore"
    if ($LASTEXITCODE -ne 0) { Fail "firebase deploy falhou" }

    Write-Host ""
    Write-Host "    === FUNCTION URLs (list) === " -ForegroundColor Cyan
    Invoke-Expression "$fb functions:list"
  Pop-Location
  Write-Ok "Firebase Functions deploy OK"
}

Write-Step "DEPLOY COMPLETO 🎉"
Write-Host "   GitHub  : https://github.com/<SEU-USUARIO>/$GhRepoName"
Write-Host "   Vercel  : https://$VercelProjectName.vercel.app"
Write-Host "   Firebase: https://console.firebase.google.com/project/$FirebaseProjectId/overview"
Write-Host "   Functions list: rode: npx firebase-tools functions:list"
