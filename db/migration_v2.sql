-- ============================================================
--  Estante — migração v2 (features de UX/navegação)
--  Cole no SQL Editor do Supabase e rode UMA vez.
--  Idempotente: pode rodar de novo sem quebrar.
-- ============================================================

-- Onda A: datas de leitura + formato físico/digital
alter table items add column if not exists started_at  date;
alter table items add column if not exists finished_at date;
alter table items add column if not exists format      text;   -- 'fisico' | 'digital' | null

-- Onda C: coleções (sagas/séries/autores)
create table if not exists collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  kind       text,                    -- 'saga' | 'autor' | null (livre)
  created_at timestamptz not null default now()
);
alter table items add column if not exists collection_id uuid;  -- sem FK (simplicidade/idempotência)

-- RLS da nova tabela
alter table collections enable row level security;
drop policy if exists p_sel on collections;
drop policy if exists p_ins on collections;
drop policy if exists p_upd on collections;
drop policy if exists p_del on collections;
create policy p_sel on collections for select using (auth.uid() = user_id);
create policy p_ins on collections for insert with check (auth.uid() = user_id);
create policy p_upd on collections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy p_del on collections for delete using (auth.uid() = user_id);

create index if not exists ix_items_collection on items(user_id, collection_id);
create index if not exists ix_items_finished on items(user_id, finished_at);
