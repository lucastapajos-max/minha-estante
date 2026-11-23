-- ============================================================
--  Estante — migração v12 (número do livro na série)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  collection_pos: posição na coleção/saga (2 = segundo livro; 1.5 = conto entre o 1 e o 2).
-- ============================================================

alter table items add column if not exists collection_pos numeric;
