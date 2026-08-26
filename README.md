# 📚 Estante

App pessoal (PWA) para organizar e acompanhar leituras de **livros, quadrinhos e mangás**.
Site estático — HTML/CSS/JS puro, sem Node, sem build. Roda com Python e publica no GitHub Pages.

## Rodar local

```bash
cd estante-pwa
python -m http.server 5500
```

Abra <http://localhost:5500> no navegador.

> Precisa ser via servidor (http), não abrindo o arquivo direto — senão o service worker e as buscas nas APIs não funcionam.

## Como está organizado

| Arquivo | Papel |
|---|---|
| `index.html` | Estrutura das telas (abas, biblioteca, modais) |
| `styles.css` | Visual (tema escuro "de estante") |
| `store.js` | **Camada de dados isolada.** Hoje: `localStorage`. Marco 2: Supabase |
| `apis.js` | Busca externa: Google Books (livros/quadrinhos) e MangaBaka (mangás) |
| `app.js` | Lógica da interface |
| `sw.js` + `manifest.webmanifest` | PWA (instalável, funciona offline) |
| `db/schema.sql` | Schema do banco para o Marco 2 (Supabase + RLS) |

## Estado atual (Marco 1 — local-first)

- ✅ Abas por categoria: Livros / Quadrinhos / Mangás
- ✅ Status: Quero ler · Lendo · Lido · Pausado · Abandonado
- ✅ Grade (com capas) e lista
- ✅ Busca automática nas APIs + cadastro manual
- ✅ Progresso (páginas nos livros; capítulos/volumes nos mangás/HQs)
- ✅ Nota (0–5 estrelas) + resenha/anotações
- ✅ Dados salvos no navegador (`localStorage`)

## Próximos marcos

- **Marco 2 — Nuvem & sync:** ligar o Supabase (auth + `db/schema.sql`) para acessar a
  mesma estante no PC e no celular. `store.js` já foi feito pra essa troca ser limpa.
- **Marco 3 — Estatísticas & metas:** meta anual, total lido no mês/ano, gêneros mais lidos.
- **Marco 4 — Histórico de sessões:** registrar cada sessão de leitura (data + quanto leu).
