-- ============================================================
--  Estante — migração v9 (situação de lançamento do mangá)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  Situação da obra segundo a MangaBaka: releasing | completed | hiatus | cancelled…
--  Vazio = ainda não consultado (o app preenche sozinho ao abrir a aba Mangás).
-- ============================================================

alter table items add column if not exists release_status text;
