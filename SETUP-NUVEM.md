# ☁️ Setup da nuvem (Marco 2) — passo a passo

Isto é o que **só você** pode fazer (envolve suas contas). São ~10 min.
Quando terminar os passos 1–4, me mande a **URL** e a **anon key** (passo 4) que eu ligo o resto.

---

## 1. Criar o projeto no Supabase
1. Entre em <https://supabase.com> → **Start your project** (login com GitHub ou e-mail).
2. **New project**. Dê um nome (ex.: `estante`), defina uma **senha do banco** (guarde-a) e escolha a região **South America (São Paulo)**.
3. Espere ~2 min o projeto subir.

## 2. Criar as tabelas
1. No projeto, menu lateral → **SQL Editor** → **New query**.
2. Abra o arquivo [`db/schema.sql`](db/schema.sql) deste projeto, **copie tudo** e cole no editor.
3. Clique **Run**. Deve aparecer "Success". (Cria items, sessões, tags, metas e push.)

## 3. Criar o seu login
1. Menu lateral → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Ponha seu **e-mail** e uma **senha** (essa é a senha que você vai usar no app).
3. Marque **Auto Confirm User** (pra não precisar confirmar e-mail).

## 4. Pegar as chaves
1. Menu lateral → **Project Settings** (engrenagem) → **API**.
2. Copie dois valores:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - **anon public** key (uma chave longa começando com `eyJ...` ou `sb_publishable_...`)
3. **Me mande esses dois aqui no chat.** São públicos por design (o RLS protege os dados) — pode colar sem medo.

> A chave **service_role** (a "secreta") **NÃO** é pra agora e **nunca** vai no chat nem no site.
> Ela só vai depois, como *segredo do GitHub*, pro robô das notificações (Fase 3).

---

## O que vem depois (eu faço, com as chaves em mãos)
- **Fase 2 — Sync:** ligo o `store.js` no Supabase + tela de login. Sua biblioteca passa a
  abrir igual no PC e no celular. Testo ao vivo antes de te entregar.
- **Fase 3 — Robô das notificações:** GitHub Actions + Python que checa a MangaDex e te
  manda o push de capítulo novo. Aí você cria o repositório e cola 2 segredos (eu te guio).
