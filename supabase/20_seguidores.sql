-- =====================================================================
-- CONECTA · Seguidores do TikTok e data da última atualização
-- Rode depois do 19. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.creators add column if not exists tiktok_followers int;
alter table public.creators add column if not exists followers_updated_at timestamptz;
