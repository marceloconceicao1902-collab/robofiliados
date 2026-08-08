# Deploy Rápido: Usando TOKENS (não precisa OAuth browser — funciona no sandbox)

> Este guia substitui o login interativo por **3 Tokens gerados via Dashboard web** (1x só).
> Com tokens, os comandos rodam em QUALQUER terminal, inclusive o sandbox.

---

## 🔑 Gerar os 3 Tokens (1 vez, via navegador)

### 1. GitHub Personal Access Token (PAT) — para push/pull
```
URL: https://github.com/settings/tokens?type=beta
  -> Generate new token
  -> Select scopes: "repo" (Full control of private repositories)
  -> Expiração: 90 dias (ou "No expiration" para teste)
  -> Copy → guarde como $GITHUB_TOKEN
```

### 2. Vercel Token
```
URL: https://vercel.com/account/tokens
  -> Create token
  -> Token name: affiliate-bot-deploy
  -> SCOPE: selecionar time default
  -> Copy → guarde como $VERCEL_TOKEN
```

### 3. Firebase CI Token (deploy functions)
```
PowerShell (fora do sandbox, 1x):
  npx firebase-tools login:ci
  → abre navegador → faz login → retorna um token no terminal
  → Copy → guarde como $FIREBASE_TOKEN
```

---

## 🚀 Rodar em PowerShell (cola tudo, inclusive os tokens)

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"

# ==========================
# COLE SEUS 3 TOKENS AQUI:
# ==========================
$env:GITHUB_TOKEN    = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 1. GitHub PAT
$env:VERCEL_TOKEN    = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 2. Vercel Token
$env:FIREBASE_TOKEN  = "1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" # 3. Firebase CI Token

# ============================================================
# Nomes dos projetos (mude se já existirem/conflitar):
$GITHUB_REPO     = "robofiliados"
$GITHUB_OWNER    = "marceloconceicao1902-collab"
$VERCEL_PROJECT  = "robofiliados"
$FIREBASE_PROJ   = "robofiliados-$([DateTime]::Now.ToString('yyMMdd'))"  # GLOBALMENTE ÚNICO
$FIREBASE_NAME   = "Robo Filiados ML Shoppe"
# ============================================================

Set-Location "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"
& .\scripts\deploy-tokens.ps1
```

---

## URLs resultantes (exemplo)

| Plataforma | URL exemplo |
|---|---|
| GitHub | `https://github.com/marceloconceicao1902-collab/robofiliados` ✅ |
| Vercel | `https://robofiliados.vercel.app` |
| Firebase Functions | `https://southamerica-east1-robofiliados-260808.cloudfunctions.net/api` |

---

## 🔁 Para cada push novo (a cada alteração no código):

```powershell
cd "G:\Meu Drive\Robo de Afiliado (Shoppe e ML)"
$gitSSD = "C:\Users\marce\AppData\Local\Temp\affiliate-git.git"
git --git-dir=$gitSSD --work-tree=. add -A
git --git-dir=$gitSSD --work-tree=. commit -m "feat: minha nova alteracao"
git --git-dir=$gitSSD --work-tree=. push origin main

# Vercel já tem integração GitHub → deploy automático em <2min
# Firebase: re-deploy manual: npx firebase-tools deploy --only functions --token=$env:FIREBASE_TOKEN
```
