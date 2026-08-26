-- ============================================================
--  Estante — migração v4 (MangaBaka: capítulos mais atuais)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
-- ============================================================

-- id da série na MangaBaka (fonte primária de "último capítulo lançado")
alter table items add column if not exists mangabaka_id text;
