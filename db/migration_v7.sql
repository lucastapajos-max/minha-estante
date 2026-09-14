-- ============================================================
--  Estante — migração v7 (livro por "posição" do Kindle/e-book)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
--
--  Melhor que a % pura (v6): o Kindle mostra "Posição X de Y", que é da
--  própria edição digital (resolve a diferença de paginação) e é bem
--  granular (toda sessão move o número). O progresso vira X/Y; as
--  estatísticas de páginas seguem usando o total físico (ISBN).
--  progress_pct (v6) fica como legado.
-- ============================================================

alter table items add column if not exists pos_atual int;
alter table items add column if not exists pos_total int;
