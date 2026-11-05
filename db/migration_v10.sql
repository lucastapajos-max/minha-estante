-- ============================================================
--  Estante — migração v10 (ISBN guardado + origem real do livro)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  isbn: guarda o ISBN da edição escolhida (usado pra buscar a capa atual depois).
--  source: passa a aceitar 'openlibrary' e 'brasilapi', que antes eram gravados como 'google_books'.
-- ============================================================

alter table items add column if not exists isbn text;

alter table items drop constraint if exists items_source_check;
alter table items add constraint items_source_check
  check (source in ('google_books','openlibrary','brasilapi','jikan','anilist','mangabaka','manual'));
