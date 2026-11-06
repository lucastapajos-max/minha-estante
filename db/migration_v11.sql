-- ============================================================
--  Estante — migração v11 (limpeza do que nunca foi usado)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  tags / item_tags: tabelas vazias (os gêneros ficam em items.genres).
--  notes: coluna sem uso. mangadex_id: sobra da MangaDex, removida do app.
-- ============================================================

drop table if exists item_tags;
drop table if exists tags;
alter table items drop column if exists notes;
alter table items drop column if exists mangadex_id;
