-- ============================================================
--  Estante — migração v5 (libera 'mangabaka' na origem do item)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  Sem isso, adicionar mangá pela busca nova falha ("Algo não
--  salvou") porque a origem 'mangabaka' viola a constraint antiga
--  (que só aceitava google_books/jikan/manual).
-- ============================================================

alter table items drop constraint if exists items_source_check;
alter table items add constraint items_source_check
  check (source in ('google_books','jikan','anilist','mangabaka','manual'));
