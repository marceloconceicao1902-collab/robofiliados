# Deploy 1-click via 3 TOKENS (GitHub, Vercel, Firebase).
# REQUISITO: Antes de rodar, defina AS 3 VARS DE AMBIENTE ABAIXO:
#   $env:GITHUB_TOKEN   = "ghp_xxx"
#   $env:VERCEL_TOKEN   = "xxx"
#   $env:FIREBASE_TOKEN = "1//0xxx"
#
# Rodar:
#   cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"
#   .\scripts\deploy-tokens.ps1

[CmdletBinding()]
param(
  [string]$GithubOwner      = "marceloconceicao1902-collab",
  [string]$GithubRepo       = "robofiliados",
  [string]$VercelProject    = "robofiliados",
  [string]$FirebaseProjId   = "robo-afiliados-e7f47",
  [string]$FirebaseProjName = "Robo Filiados ML Shoppe",
  [string]$GitSSD           = "C:\Users\marce\AppData\Local\Temp\affiliate-git.git",
  [string]$NodeModulesPath  = "C:\Users\marce\AppData\Local\Temp\affiliate-install\node_modules"
)

$PROJ_DIR = Split-Path -Parent $PSScriptRoot
Set-Location $PROJ_DIR
$ErrorActionPreference = 'Continue'

function Write-Step($m) { Write-Host ""; Write-Host ("==> " + $m) -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host ("    [OK] " + $m) -ForegroundColor Green }
function Write-Warn($m) { Write-Host ("    [WARN] " + $m) -ForegroundColor Yellow }
function Fail($m)       { Write-Host ("    [FAIL] " + $m) -ForegroundColor Red; exit 1 }
function g {
  param([Parameter(ValueFromRemainingArguments=$true)]$args2)
  git --git-dir=$GitSSD --work-tree=$PROJ_DIR @args2
}

Write-Step "Validacao de TOKENS"
if (-not $env:GITHUB_TOKEN)   { Fail "GITHUB_TOKEN faltando. Sete: $env:GITHUB_TOKEN='ghp_xxx'"  } else { Write-Ok ("GITHUB_TOKEN OK (length=" + $env:GITHUB_TOKEN.Length + ")") }
if (-not $env:VERCEL_TOKEN)   { Fail "VERCEL_TOKEN faltando. Sete: $env:VERCEL_TOKEN='xxx'"      } else { Write-Ok ("VERCEL_TOKEN OK (length=" + $env:VERCEL_TOKEN.Length + ")") }
if (-not $env:FIREBASE_TOKEN) { Fail "FIREBASE_TOKEN faltando. Sete: $env:FIREBASE_TOKEN='1//0xx' (obtenha via 'npx firebase-tools login:ci')" } else { Write-Ok ("FIREBASE_TOKEN OK (length=" + $env:FIREBASE_TOKEN.Length + ")") }

Write-Step ("1. GitHub: verificar repo https://github.com/" + $GithubOwner + "/" + $GithubRepo)
try {
  $headers = @{ Authorization = ("Bearer " + $env:GITHUB_TOKEN) }
  $repoApi = Invoke-RestMethod -Method GET -Uri ("https://api.github.com/repos/" + $GithubOwner + "/" + $GithubRepo) -Headers $headers -UseBasicParsing
  Write-Ok ("Repo GitHub existe: id=" + $repoApi.id + ", default_branch=" + $repoApi.default_branch)
} catch {
  Write-Warn "Repo nao encontrado. Tentando criar via API..."
  $body = @{ name=$GithubRepo; private=$true; description="Bot Promocoes WhatsApp Afiliados Shopee e Mercado Livre" } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri "https://api.github.com/user/repos" -Headers $headers -Body $body -UseBasicParsing | Out-Null
  Write-Ok "Repo criado via API REST"
}

Write-Host "    Garantindo remote e push..."
$expected = ("https://github.com/" + $GithubOwner + "/" + $GithubRepo + ".git")
$cur = (g remote get-url origin 2>$null)
if (-not $cur -or $cur -ne $expected) {
  g remote remove origin 2>$null
  g remote add origin $expected
}
g push --porcelain origin main 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { Fail "GitHub push origin main falhou" }
Write-Ok "GitHub push OK"

Write-Step ("2. Vercel: project add " + $VercelProject + " + link + --prod deploy")
$GIT_URL = ("https://github.com/" + $GithubOwner + "/" + $GithubRepo + ".git")

$list = (vercel ls --token=$env:VERCEL_TOKEN --yes 2>&1) -join "`n"
if ($list -match [regex]::Escape($VercelProject)) {
  Write-Ok ("Projeto Vercel '" + $VercelProject + "' ja existe")
} else {
  Write-Host ("    Criando projeto Vercel '" + $VercelProject + "'...")
  vercel project add $VercelProject --yes --token=$env:VERCEL_TOKEN 2>&1 | Select-Object -Last 3
}

vercel link --yes --project=$VercelProject --repo=$GIT_URL --token=$env:VERCEL_TOKEN 2>&1 | Select-Object -Last 3

$vars = [ordered]@{
  "NODE_ENV"                  = "production"
  "PORT"                      = "80"
  "SHOPEE_AFFILIATE_TAG"      = "SEU_SHOPEE_TAG_AQUI"
  "ML_AFFILIATE_TAG"          = "SEU_ML_ID_AQUI"
  "WHATSAPP_PROVIDER"         = "evolution"
  "SEND_MIN_DELAY"            = "30000"
  "SEND_MAX_DELAY"            = "90000"
  "SEND_MAX_PER_HOUR"         = "200"
  "ANTI_DUPLICATE_WINDOW_HOURS" = "24"
  "DATABASE_URL"              = "file:./prod.db"
}
foreach ($kv in $vars.GetEnumerator()) {
  Write-Host ("    env set " + $kv.Key)
  $null = echo $kv.Value | vercel env add $kv.Key production --yes --token=$env:VERCEL_TOKEN 2>$null
}

Write-Host "    Deploy prod Vercel (pode levar 1-3 min)..."
$deployOut = (vercel --prod --yes --token=$env:VERCEL_TOKEN 2>&1)
$deployOut | Select-Object -Last 5
$vercelUrl = ($deployOut | Select-String -Pattern "https://[^\s]+vercel\.app" | Select-Object -First 1).Matches.Value
if (-not $vercelUrl) { $vercelUrl = ("https://" + $VercelProject + ".vercel.app") }
Write-Ok ("Vercel Deploy: " + $vercelUrl)

Write-Step "3. Firebase Functions: criar projeto + build + deploy"
Push-Location (Join-Path $PROJ_DIR "functions")
  if (-not (Test-Path "node_modules")) {
    Write-Host "    Install functions deps..."
    $env:NODE_PATH = $NodeModulesPath
    npm install --include=dev --legacy-peer-deps --force 2>&1 | Select-Object -Last 3
  }
  Write-Host "    Build functions TS -> lib/..."
  npm run build 2>&1 | Select-Object -Last 3
  if ($LASTEXITCODE -ne 0) { Fail "functions build TS falhou" }
  Write-Ok "Functions build OK"
Pop-Location

Push-Location $PROJ_DIR
  $fb = "npx --yes firebase-tools"
  $list = (Invoke-Expression ($fb + " projects:list --token=" + $env:FIREBASE_TOKEN + " 2>&1")) -join "`n"
  if ($list -match [regex]::Escape($FirebaseProjId)) {
    Write-Ok ("Projeto Firebase '" + $FirebaseProjId + "' ja existe")
  } else {
    Write-Host ("    Criando projeto Firebase id='" + $FirebaseProjId + "'...")
    Invoke-Expression ($fb + " projects:create '" + $FirebaseProjId + "' --display-name='" + $FirebaseProjName + "' --token=" + $env:FIREBASE_TOKEN + " 2>&1") | Select-Object -Last 5
  }
  Write-Host "    firebase use..."
  Invoke-Expression ($fb + " use --add '" + $FirebaseProjId + "' --token=" + $env:FIREBASE_TOKEN) | Out-Null
  Write-Host "    Deploy functions + firestore.rules..."
  $fbDeployOut = (Invoke-Expression ($fb + " deploy --only functions,firestore --token=" + $env:FIREBASE_TOKEN + " 2>&1"))
  $fbDeployOut | Select-Object -Last 8
  Write-Host "    functions:list..."
  $fbList = (Invoke-Expression ($fb + " functions:list --token=" + $env:FIREBASE_TOKEN + " 2>&1")) -join "`n"
  $fbList | Select-Object -Last 10
Pop-Location
Write-Ok "Firebase Functions deploy OK"

Write-Step "----------------------------------------"
Write-Host "   [SUCESSO] DEPLOY CONCLUIDO" -ForegroundColor Magenta
Write-Step "----------------------------------------"
Write-Host ("   [GitHub]   : https://github.com/" + $GithubOwner + "/" + $GithubRepo)
Write-Host ("   [Vercel]   : " + $vercelUrl + "  (teste GET /api/health)")
Write-Host ("   [Firebase] : Projeto ID = " + $FirebaseProjId)
Write-Host ("               Console: https://console.firebase.google.com/project/" + $FirebaseProjId + "/overview")
Write-Host "               Functions URL (exemplo):"
Write-Host ("               https://southamerica-east1-" + $FirebaseProjId + ".cloudfunctions.net/api/api/health")
Write-Step "----------------------------------------"
