-- =====================================================================
-- CONECTA · Grupos de WhatsApp da marca
-- Cada marca pode ter grupos (comunidade da marca, afiliação, campanha…).
-- Veem o grupo: a equipe, a própria marca e as creators da marca
-- (base da marca ou aprovadas em alguma campanha da marca).
-- Rode depois do 18. Pode rodar de novo sem problema.
-- =====================================================================
create table if not exists public.brand_links (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'Comunidade da marca' check (kind in ('Comunidade da marca','Afiliação','Campanha','Outro')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.creator_of_brand(b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.my_creator() is not null and (
    exists(select 1 from creator_brands x where x.brand_id = b and x.creator_id = public.my_creator())
    or exists(select 1 from campaign_applications a join campaigns c on c.id = a.campaign_id where c.brand_id = b and a.creator_id = public.my_creator() and a.status = 'Aprovada'));
$$;

alter table public.brand_links enable row level security;
drop policy if exists bl_sel on public.brand_links; drop policy if exists bl_all on public.brand_links;
create policy bl_sel on public.brand_links for select using (public.can_mod('marcas') or public.can_mod('campanhas') or brand_id = public.my_brand() or public.creator_of_brand(brand_id));
create policy bl_all on public.brand_links for all using (public.can_mod('marcas') or public.can_mod('campanhas')) with check (public.can_mod('marcas') or public.can_mod('campanhas'));

-- Ao entrar na base da marca, a creator recebe o convite dos grupos da marca
create or replace function public.tg_brand_group_invite() returns trigger language plpgsql security definer set search_path = public as $$
declare bn text;
begin
  if exists(select 1 from brand_links where brand_id = new.brand_id) then
    select name into bn from brands where id = new.brand_id;
    insert into notifications (user_id, text, link)
    select p.id, '💬 Entre no grupo da ' || coalesce(bn, 'marca') || ' no WhatsApp', '/clube/marcas'
    from profiles p where p.creator_id = new.creator_id and p.role = 'creator' and p.status = 'ativo';
  end if;
  return new;
end $$;
drop trigger if exists brand_group_invite on public.creator_brands;
create trigger brand_group_invite after insert on public.creator_brands for each row execute function public.tg_brand_group_invite();
