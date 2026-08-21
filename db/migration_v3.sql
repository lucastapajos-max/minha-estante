-- ============================================================
--  Estante — migração v3 (histórico de leitura + volume)
--  Cole no SQL Editor do Supabase e rode UMA vez. Idempotente.
-- ============================================================

-- guarda a posição final da sessão (pra mostrar "do cap. 12 ao 15")
alter table reading_sessions add column if not exists to_pos int;

-- índice pro histórico (mais recentes primeiro, por usuário)
create index if not exists ix_sessions_user_date on reading_sessions(user_id, date desc);
