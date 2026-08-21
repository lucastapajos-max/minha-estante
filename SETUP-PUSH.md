# 🔔 Setup das notificações (Fase 3)

O código já está pronto (botão 🔔 na ficha do mangá, service worker de push e o robô).
Faltam **3 coisas suas** (envolvem chaves/segredos). ~10 min.

---

## 1. Gerar as chaves VAPID

No PowerShell (você tem Python):

```bash
pip install py-vapid
```
```bash
vapid --gen
```

Isso cria **`private_key.pem`** e **`public_key.pem`** na pasta atual. Agora pegue a chave pública no formato do navegador:

```bash
vapid --applicationServerKey
```

Vai imprimir algo como:
`Application Server Key = BEl62iUY...` — **copie só o valor** (o `BEl62...`).

---

## 2. Colar a chave PÚBLICA no app

Abra [`config.js`](config.js) e cole o valor em `VAPID_PUBLIC_KEY`:

```js
window.VAPID_PUBLIC_KEY = "BEl62iUY...";   // ← a Application Server Key
```

Depois: `git push` (o Claude te ajuda a subir). A chave pública **pode** ir no repo — ela é pública.

---

## 3. Criar os 2 segredos no GitHub

No repo **`minha-estante`** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crie dois:

**a) `VAPID_PRIVATE_KEY`**
- Abra o arquivo `private_key.pem` (do passo 1) num editor de texto.
- Cole **todo o conteúdo** dele (incluindo as linhas `-----BEGIN...` e `-----END...`).

**b) `SUPABASE_SERVICE_KEY`**
- No Supabase → **Project Settings** → **API** → seção **Project API keys** → copie a chave **`service_role`** (a *secret*, não a anon).
- Cole como valor do segredo.

> ⚠️ A `service_role` e a `private_key.pem` são **secretas**. Vão **só** como segredos do GitHub — nunca no `config.js`, nunca no chat, nunca commitadas.

---

## 4. Testar

1. No app (já com a chave pública), abra um mangá em andamento → **🔔 Avisar quando sair capítulo novo** → aceite a permissão.
2. No repo → aba **Actions** → workflow **"Checar novos capítulos (push)"** → **Run workflow** (rodar na mão).
3. Veja o log. Pra forçar um teste, dá pra baixar 1 no `last_notified_chapter` do item (no Table Editor do Supabase) e rodar de novo — deve chegar a notificação.

Depois disso, o robô roda sozinho **a cada 6 horas**.
