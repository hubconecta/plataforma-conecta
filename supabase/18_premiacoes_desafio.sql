-- =====================================================================
-- CONECTA · Premiação por colocação nos desafios
-- Cada desafio pode ter vários prêmios: 1º, 2º, 3º lugar… ou "todas que
-- baterem a meta", cada um com requisito (ex.: 100 vídeos e 70 vendas),
-- tipo de prêmio, descrição/produto e valor.
-- Rode depois do 17. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.challenges add column if not exists prizes jsonb not null default '[]';
