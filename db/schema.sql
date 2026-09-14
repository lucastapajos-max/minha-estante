-- ============================================================
--  Estante — schema v1 (Supabase / Postgres)
--  Use no Marco 2 (sincronização entre dispositivos).
--  Cole tudo no SQL Editor do Supabase e rode uma vez.
--
--  SEGURANÇA: RLS ligado em todas as tabelas; cada usuário só
--  enxerga/mexe nas SUAS linhas (user_id = auth.uid()).
--  Espelha o modelo do store.js local.
-- ============================================================

-- 1) ITEMS — cada livro / quadrinho / mangá da estante ----------
create table if not exists items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  kind           text not null check (kind in ('livro','quadrinho','manga')),
  title          text not null,
  authors        text default '',
  cover_url      text default '',
  synopsis       text default '',
  status         text not null default 'quero_ler'
                   check (status in ('quero_ler','lendo','lido','pausado','abandonado')),
  -- progresso (livro usa páginas; hq/mangá usam capítulos/volumes)
  total_pages     int,
  current_page    int default 0,
  progress_pct    int,                              -- livro por % (e-book/Kindle); nulo = por página
  total_chapters  int,
  current_chapter int default 0,
  total_volumes   int,
  current_volume  int default 0,
  rating         numeric(2,1),                     -- 0–5 (meia estrela permitida)
  review         text default '',
  notes          text default '',
  genres         text[] default '{}',
  source         text default 'manual'
                   check (source in ('google_books','jikan','anilist','mangabaka','manual')),
  external_id    text default '',
  -- notificação de novos capítulos (mangás em andamento)
  notify         boolean not null default false,   -- sino ligado?
  mangadex_id    text default '',                  -- legado (MangaDex desativada; mantido p/ não quebrar dados antigos)
  mangabaka_id   text default '',                  -- id na MangaBaka (fonte primária de capítulos)
  last_notified_chapter int,                       -- último capítulo já avisado
  -- datas de leitura + formato + coleção (features de UX)
  started_at     date,
  finished_at    date,
  format         text,                             -- 'fisico' | 'digital' | null
  collection_id  uuid,                             -- FK lógica p/ collections
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- COLLECTIONS — sagas/séries/pastas por autor
create table if not exists collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  kind       text,                                 -- 'saga' | 'autor' | null
  created_at timestamptz not null default now()
);

-- 2) READING_SESSIONS — histórico "li tanto em tal dia" ---------
create table if not exists reading_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  item_id    uuid not null references items on delete cascade,
  date       timestamptz not null default now(),
  amount     int not null default 0,               -- quanto leu na sessão
  unit       text not null default 'paginas'
               check (unit in ('paginas','capitulos','volumes')),
  to_pos     int,                                   -- posição final (ex.: capítulo 15)
  note       text default ''
);

-- 3) TAGS — etiquetas do usuário --------------------------------
create table if not exists tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  name     text not null,
  unique (user_id, name)
);

-- 4) ITEM_TAGS — relação N:N item <-> tag -----------------------
create table if not exists item_tags (
  item_id  uuid not null references items on delete cascade,
  tag_id   uuid not null references tags on delete cascade,
  user_id  uuid not null references auth.users on delete cascade,
  primary key (item_id, tag_id)
);

-- 5) GOALS — meta anual de leitura (1 linha por ano) ------------
create table if not exists goals (
  user_id  uuid not null references auth.users on delete cascade,
  year     int not null,
  target   int not null default 0,                 -- ex.: 20 livros/ano
  primary key (user_id, year)
);

-- 6) PUSH_SUBSCRIPTIONS — pra onde o robô manda a notificação ----
--    (uma linha por dispositivo/navegador que ligou o sino)
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null,                        -- URL do serviço de push do navegador
  p256dh     text not null,                        -- chaves da inscrição (Web Push)
  auth       text not null,
  user_agent text default '',
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ============================================================
--  RLS — trava tudo no dono da linha
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['items','reading_sessions','tags','item_tags','goals','push_subscriptions','collections'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_sel on %I;', t);
    execute format('drop policy if exists p_ins on %I;', t);
    execute format('drop policy if exists p_upd on %I;', t);
    execute format('drop policy if exists p_del on %I;', t);
    execute format('create policy p_sel on %I for select using (auth.uid() = user_id);', t);
    execute format('create policy p_ins on %I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy p_upd on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy p_del on %I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- índices úteis
create index if not exists ix_items_user_kind on items(user_id, kind);
create index if not exists ix_items_user_status on items(user_id, status);
create index if not exists ix_items_notify on items(notify) where notify = true;
create index if not exists ix_sessions_item on reading_sessions(item_id, date);
