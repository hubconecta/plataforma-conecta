-- =====================================================================
-- CONECTA · Logo no formulário
-- Cada formulário pode ter o próprio logo no topo (se ficar vazio, usa o logo da marca).
-- Rode depois do 14. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.forms add column if not exists logo_path text;
