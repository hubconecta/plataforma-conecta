-- =====================================================================
-- CONECTA · Tipos de campanha, nichos, perfis e vários links por entrega
-- Rode depois do 08. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.campaigns add column if not exists niches text[] not null default '{}';
alter table public.campaigns add column if not exists campaign_types text[] not null default '{}';
alter table public.campaigns add column if not exists profiles_wanted text[] not null default '{}';
alter table public.campaigns add column if not exists contents_per_creator int;
update public.campaigns set niches = array[niche] where niche is not null and niche <> '' and niches = '{}';

alter table public.challenge_submissions add column if not exists links text[] not null default '{}';
update public.challenge_submissions set links = array[link] where link is not null and links = '{}';
