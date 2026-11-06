# 🚀 Publicar a Estante (Cloudflare Pages)

Objetivo: colocar o app num endereço **https** (`https://estante.pages.dev`) pra abrir
no Android e receber notificações push. Mesmo caminho do seu `meu-dinheiro`/Bolão:
conectado ao GitHub → `git push` republica sozinho.

O commit local **já está feito** (o Claude fez). Faltam os passos abaixo (são seus).

---

## Passo 1 — criar o repositório no GitHub (PRIVADO)

1. Vá em <https://github.com/new>.
2. Nome: `estante` · Visibilidade: **Private** · **não** marque nada (sem README).
3. **Create repository.**

Depois, no terminal (PowerShell), dentro da pasta do app:

```bash
git -C D:/Programas/Claude/estante-pwa remote add origin https://github.com/lucastapajos-max/estante.git
git -C D:/Programas/Claude/estante-pwa push -u origin main
```

> Se pedir login, o Git abre o navegador pra autorizar (Git Credential Manager) — mesmo
> fluxo do meu-dinheiro. O repo é privado; a anon key do Supabase pode ir junto (é pública
> por design). A `service_role` **nunca** vai no repo.

---

## Passo 2 — conectar no Cloudflare Pages

1. Entre em **dash.cloudflare.com** → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
2. Autorize o GitHub e escolha o repo `estante`.
3. Configurações de build (é site estático, sem build):
   - **Framework preset:** `None`
   - **Build command:** *(vazio)*
   - **Build output directory:** `/`
4. **Save and Deploy.** Em ~1 min sai um endereço tipo `https://estante.pages.dev`.

---

## Passo 3 — instalar no Android / Firefox

- **Android (Chrome):** abra o `https://...pages.dev` → menu **⋮ → Instalar app**.
- **Firefox desktop:** só abrir o endereço e logar. (Push funciona sem instalar.)

---

## Atualizações futuras

- Mudou algo? `git push` → o Cloudflare republica sozinho.
- Ao mexer nos arquivos do app, o Claude sobe a versão em `sw.js`
  (`const VERSAO = "estante-vX"`) pra forçar o cache novo.

---

## Depois do deploy

Com o app no ar em `https://...`, seguimos pra **Fase 3 — o robô das notificações**
(GitHub Actions + Python + MangaBaka + chaves VAPID). Aí você cria 2 segredos no repo
e o Claude te guia.
