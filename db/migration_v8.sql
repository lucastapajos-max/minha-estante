-- ============================================================
--  Estante — migração v8 (fila "Próxima leitura")
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  Ordem dos itens em "Quero ler". Nulo = fim da fila (item novo).
-- ============================================================

alter table items add column if not exists fila_ordem int;
