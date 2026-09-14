-- ============================================================
--  Estante — migração v6 (livro por porcentagem: e-book/Kindle)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  Kindle/e-book mostram só posição e %, não a página. Esta coluna
--  guarda o progresso em % (0–100) quando o livro é acompanhado assim.
--  Nula = acompanhado por página (padrão), como sempre.
-- ============================================================

alter table items add column if not exists progress_pct int;
