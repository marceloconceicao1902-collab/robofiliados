# Deploy — GitHub + Vercel + Firebase (CLI GUIA OFICIAL)

> Este projeto é **Affiliate Promotion Bot API** (Fastify + TypeScript + Prisma).
> Todos os arquivos de configuração já foram criados (vercel.json, firebase.json, functions/, adapters serverless Fastify).
> O repositório git já tem **commit inicial b7ee799** (bare repo no SSD local).

---

## ⚠️ Antes de tudo: Autenticação (1x)

As CLIs **não podem criar projetos sem estar logado** em sua conta (segurança/faturamento). Execute os 3 logins 1 vez em um PowerShell:

```powershell
# 1. GitHub CLI (instale 1x se faltar)
winget install --id GitHub.cli -e --accept-source-agreements
gh auth login                # Siga os passos no browser (OAuth)

# 2. Vercel CLI
vercel login                 # Siga no browser (OAuth)

# 3. Firebase CLI
npx --yes firebase-tools login   # OAuth no browser (--no-localhost se for servidor remoto)
```

---

## 🐙 1. GitHub — Criar Repositório + Push (CLI gh)

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"

# --- 1a. Converter bare repo SSD + .git pointer (sem problemas de Drive File Stream) ---
$gitSSD = "C:\Users\marce\AppData\Local\Temp\affiliate-git.git"
$proj    = "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"

# Cria alias do git para sempre usar --git-dir + --work-tree (1x)
function g { git --git-dir=$gitSSD --work-tree=$proj @args }

# Verifica status e log
g status
g log --oneline -n 3

# --- 1b. Criar repositório PRIVADO no GitHub + remote origin + push 1º commit ---
gh repo create affiliate-bot-ml-shoppe `
    --private `
    --description "Bot Promoções WhatsApp Afiliados Shopee + Mercado Livre (Fastify API)" `
    --source=. `
    --remote=origin `
    --push
```

Se `gh` recusar `--source=.` por causa do bare no SSD, use forma manual:

```powershell
gh repo create affiliate-bot-ml-shoppe --private -d "Bot Promoções WhatsApp Afiliados"
g remote add origin https://github.com/<SEU_USUARIO>/affiliate-bot-ml-shoppe.git
g branch -M main
g push -u origin main
```

---

## ▲ 2. Vercel — Criar Projeto + Deploy Produção (CLI vercel)

Arquivos prontos:
- [vercel.json](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/vercel.json) — rewrites → `/api/*`, runtime `@vercel/node@3`
- [api/index.ts](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/api/index.ts) — handler Fastify serverless + cached app

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"

# --- 2a. Criar projeto Vercel (1x) - nome deve ser URL-unico ---
vercel project add affiliate-bot-ml-shoppe --yes

# --- 2b. Linkar diretorio atual ao projeto (1x) ---
vercel link --yes --project=affiliate-bot-ml-shoppe

# --- 2c. Setar variaveis de ambiente OBRIGATORIAS (1x) ---
vercel env add SHOPEE_AFFILIATE_TAG production    # ex: seu_id_shopee_xxxx
vercel env add ML_AFFILIATE_TAG production        # ex: 12345678
vercel env add WHATSAPP_PROVIDER production       # "baileys" ou "evolution"
vercel env add SEND_MIN_DELAY production 30000
vercel env add SEND_MAX_DELAY production 90000
vercel env add ANTI_DUPLICATE_WINDOW_HOURS production 24
vercel env add DATABASE_URL production "file:./prod.db"

# Para Evolution API (opcional):
vercel env add EVOLUTION_API_URL production
vercel env add EVOLUTION_API_INSTANCE production
vercel env add EVOLUTION_API_TOKEN production

# --- 2d. Deploy PRODUÇÃO ---
vercel --prod --yes
```

Após deploy, pegue a URL (ex: `https://affiliate-bot-ml-shoppe.vercel.app`) e teste:

```
GET  https://affiliate-bot-ml-shoppe.vercel.app/             → status + version
GET  https://affiliate-bot-ml-shoppe.vercel.app/api/health   → health check
POST https://affiliate-bot-ml-shoppe.vercel.app/api/campaigns/run
```

---

## 🔥 3. Firebase Functions — Criar Projeto + Deploy (CLI firebase)

Arquivos prontos:
- [firebase.json](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/firebase.json) — functions source=functions, runtime=nodejs20
- [.firebaserc](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/.firebaserc) — default `affiliate-bot-ml-shoppe`
- [functions/src/index.ts](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/functions/src/index.ts) — Fastify exportado como `export const api = functions.https.onRequest({ region: southamerica-east1, ... })`
- [functions/package.json](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/functions/package.json) — deps + scripts build/deploy
- [functions/tsconfig.json](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/functions/tsconfig.json)
- [firestore.rules](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/firestore.rules), [firestore.indexes.json](file:///g:/Meu%20Drive/Robo%20de%20Afiliado%20(Shoppe%20e%20ML)/firestore.indexes.json)

### Passos CLI:

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"

# --- 3a. Instalar dependencias functions (1x) ---
Push-Location functions
  # Importante: functions TEM package.json PROPRIO (requisito Firebase)
  $env:NODE_PATH = "C:\Users\marce\AppData\Local\Temp\affiliate-install\node_modules"
  npm install --include=dev --legacy-peer-deps --force
  npm run build        # Gera functions/lib/index.js
Pop-Location

# --- 3b. Criar PROJETO no Firebase Console (via CLI) ---
# ID_PROJETO deve ser GLOBALMENTE UNICO (em tudo do GCP/Firebase)
# !! Se falhar "id already exists", mude ex: affiliate-bot-ml-shoppe-{SEUNOME}-42
npx --yes firebase-tools projects:create affiliate-bot-ml-shoppe `
    --display-name="Affiliate Bot ML+Shoppe" `
    --no-color

# --- 3c. Fazer uso do projeto (atualiza .firebaserc) ---
npx --yes firebase-tools use affiliate-bot-ml-shoppe

# --- 3d. (1x) Upgrade para plano Blaze se for usar Functions (gratis ate certa cota) ---
# https://console.firebase.google.com/project/affiliate-bot-ml-shoppe/usage/details

# --- 3e. Deploy Functions + Firestore rules ---
npx --yes firebase-tools deploy --only functions,firestore

# --- 3f. Ver URL da function ---
npx --yes firebase-tools functions:list
```

URL de exemplo após deploy (Região `southamerica-east1`):

```
https://southamerica-east1-affiliate-bot-ml-shoppe.cloudfunctions.net/api

GET  .../api/              → info
GET  .../api/api/health    → healthcheck
POST .../api/api/campaigns/run
```

---

## 📋 Resumo URLs de produção (exemplos)

| Plataforma | URL de exemplo |
|---|---|
| **GitHub** | `https://github.com/<SEU_USUARIO>/affiliate-bot-ml-shoppe` |
| **Vercel** (API serverless) | `https://affiliate-bot-ml-shoppe.vercel.app` |
| **Firebase Functions** | `https://southamerica-east1-affiliate-bot-ml-shoppe.cloudfunctions.net/api` |

---

## 🚨 Limitações Serverless (IMPORTANTE!)

Este projeto foi criado como **BOT long-running** (WhatsApp Baileys + BullMQ + cron).
Em ambientes serverless (Vercel Functions / Firebase Functions):

| Funcionalidade | Vercel / Firebase Functions (serverless) | Recomendação produção |
|---|---|---|
| API REST `/api/campaigns/run`, `/api/groups`, `/api/health` | ✅ Funciona perfeitamente | Esta API deployada |
| **Cron job envio massa** (node-cron BullMQ) | ❌ Não roda em background | Use **Vercel Cron** (`vercel.json` → `crons`) OU **Cloud Scheduler** (GCP/Firebase) batendo em `/api/campaigns/run` a cada X minutos |
| **Baileys / WhatsApp local** | ❌ Sem sessão persistente | Use **Evolution API** (provedor HTTP externo, deployado separadamente em VM/EC2) ou Cloud Run + volume para sessions |
| **SQLite** (`dev.db`) | ❌ Efêmero (perde tudo no restart) | Migrar para **Supabase/Postgres** ou **Firestore** nativo do Firebase |
| **Prisma + SQLite** | ❌ Efêmero | Trocar `datasource provider` para `"postgresql"` e usar Neon/Supabase/Aiven |

---

## 🚀 Comando Turbo (tudo em 1 script)

Execute em PowerShell após logar em gh/vercel/firebase:

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\deploy-setup.ps1
```
