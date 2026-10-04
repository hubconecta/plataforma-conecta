-- =====================================================================
-- CONECTA · Perfis com foto, logo das marcas, arquivos das creators
-- e links dos grupos de WhatsApp (comunidade e por campanha).
-- Rode depois do 10. Pode rodar de novo sem problema.
-- =====================================================================

-- Pastas de arquivos: "perfis" (fotos e logos, públicas) e "docs" (media kit e relatórios, privadas)
insert into storage.buckets (id, name, public, file_size_limit)
values ('perfis', 'perfis', true, 5242880), ('docs', 'docs', false, 26214400)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Perfil de quem usa a plataforma (equipe, marca, creator)
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists instagram text;

-- Creator: foto, bio e redes
alter table public.creators add column if not exists avatar_path text;
alter table public.creators add column if not exists bio text;

-- Marca: logo e apresentação
alter table public.brands add column if not exists logo_path text;
alter table public.brands add column if not exists description text;
drop view if exists public.brand_public;
create view public.brand_public as select id, name, instagram, category, logo_path from public.brands;
grant select on public.brand_public to authenticated;

-- Arquivos da creator: media kit, relatórios de vendas, outros
create table if not exists public.creator_files (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  kind text not null default 'Media kit' check (kind in ('Media kit','Relatório de vendas','Portfólio','Outro')),
  title text not null, path text not null,
  created_at timestamptz not null default now()
);
alter table public.creator_files enable row level security;
drop policy if exists cf_sel on public.creator_files; drop policy if exists cf_own on public.creator_files; drop policy if exists cf_del on public.creator_files;
create policy cf_sel on public.creator_files for select using (creator_id = public.my_creator() or public.can_mod('creators') or (public.my_brand() is not null and public.creator_works_for_my_brand(creator_id)));
create policy cf_own on public.creator_files for insert with check (creator_id = public.my_creator() or public.can_mod('creators'));
create policy cf_del on public.creator_files for delete using (creator_id = public.my_creator() or public.can_mod('creators'));

-- Grupos de WhatsApp gerais (comunidade, VIP…) por público
create table if not exists public.community_links (
  id uuid primary key default gen_random_uuid(),
  title text not null, url text not null,
  audience text not null default 'Creators' check (audience in ('Todos','Creators','Marcas','Equipe')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.community_links enable row level security;
drop policy if exists cl_sel on public.community_links; drop policy if exists cl_all on public.community_links;
create policy cl_sel on public.community_links for select using (
  public.is_staff()
  or (audience in ('Todos','Creators') and public.my_creator() is not null)
  or (audience in ('Todos','Marcas') and public.my_brand() is not null));
create policy cl_all on public.community_links for all using (public.is_ceo() or public.can_mod('campanhas')) with check (public.is_ceo() or public.can_mod('campanhas'));

-- Grupo da campanha: só a equipe, a marca da campanha e as creators aprovadas veem
create table if not exists public.campaign_links (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  url text not null,
  title text,
  updated_at timestamptz not null default now()
);
alter table public.campaign_links enable row level security;
drop policy if exists cpl_sel on public.campaign_links; drop policy if exists cpl_all on public.campaign_links;
create policy cpl_sel on public.campaign_links for select using (public.can_mod('campanhas') or public.campaign_of_my_brand(campaign_id) or public.creator_approved_in(campaign_id));
create policy cpl_all on public.campaign_links for all using (public.can_mod('campanhas')) with check (public.can_mod('campanhas'));

-- Ao ser aprovada numa campanha com grupo, a creator recebe o convite
create or replace function public.tg_group_invite() returns trigger language plpgsql security definer set search_path = public as $$
declare l text; cn text;
begin
  if new.status = 'Aprovada' and old.status is distinct from 'Aprovada' then
    select url into l from campaign_links where campaign_id = new.campaign_id;
    if l is not null then
      select name into cn from campaigns where id = new.campaign_id;
      insert into notifications (user_id, text, link)
      select p.id, '💬 Entre no grupo da campanha ' || coalesce(cn, '') || ' no WhatsApp', '/clube/minhas'
      from profiles p where p.creator_id = new.creator_id and p.role = 'creator' and p.status = 'ativo';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists group_invite on public.campaign_applications;
create trigger group_invite after update of status on public.campaign_applications for each row execute function public.tg_group_invite();
