-- =====================================================================
-- CONECTA · Formulários da marca e creators "só da marca"
-- • Um formulário pode ser de uma marca (link exclusivo): as respostas
--   aparecem no Portal da Marca.
-- • Quem responde entra na base de creators daquela marca e pode criar
--   o acesso dela na hora. Se não pedir para entrar na base da Conecta,
--   ela só vê os desafios das marcas dela (sem oportunidades, sem comunidade).
-- Rode depois do 13. Pode rodar de novo sem problema.
-- =====================================================================

alter table public.forms add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.forms add column if not exists create_access boolean not null default false;
alter table public.forms add column if not exists ask_join boolean not null default false;
alter table public.form_responses add column if not exists join_conecta boolean;

-- Creator só da marca (true) ou da base completa da Conecta (false)
alter table public.creators add column if not exists brand_only boolean not null default false;

-- Base de creators de cada marca
create table if not exists public.creator_brands (
  creator_id uuid not null references public.creators(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  source text not null default 'Formulário',
  form_id uuid references public.forms(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (creator_id, brand_id)
);
alter table public.creator_brands enable row level security;
drop policy if exists cb_sel on public.creator_brands; drop policy if exists cb_all on public.creator_brands;
create policy cb_sel on public.creator_brands for select using (public.can_mod('creators') or public.can_mod('formularios') or brand_id = public.my_brand() or creator_id = public.my_creator());
create policy cb_all on public.creator_brands for all using (public.can_mod('creators')) with check (public.can_mod('creators'));

-- ---------- Ajudantes ----------
create or replace function public.my_creator_limited() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select brand_only from creators where id = public.my_creator()), false);
$$;
create or replace function public.my_creator_brands() returns setof uuid language sql stable security definer set search_path = public as $$
  select brand_id from creator_brands where creator_id = public.my_creator();
$$;

-- A marca enxerga as creators da base dela (além das que trabalham nas campanhas dela)
create or replace function public.creator_works_for_my_brand(cr uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.my_brand() is not null and (
    exists(select 1 from campaign_applications a join campaigns c on c.id = a.campaign_id where a.creator_id = cr and a.status = 'Aprovada' and c.brand_id = public.my_brand())
    or exists(select 1 from creator_brands b where b.creator_id = cr and b.brand_id = public.my_brand()));
$$;

-- Desafios: a creator "só da marca" vê só os desafios das marcas dela
create or replace function public.challenge_visible_to_me(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.status in ('Ativo','Encerrado') and public.my_creator() is not null
    and (not public.my_creator_limited() or x.brand_id in (select public.my_creator_brands())
         or exists(select 1 from challenge_participants p where p.challenge_id = x.id and p.creator_id = public.my_creator()))
    and (x.audience not like 'Participantes%' or x.campaign_id is null or public.creator_approved_in(x.campaign_id)
         or exists(select 1 from challenge_participants p where p.challenge_id = x.id and p.creator_id = public.my_creator())));
$$;

-- Campanhas: a creator "só da marca" não vê as oportunidades abertas da Conecta
drop policy if exists cx_camp_sel on public.campaigns;
create policy cx_camp_sel on public.campaigns for select using (public.can_mod('campanhas') or brand_id = public.my_brand()
  or (public.my_creator() is not null and ((status in ('Inscrições abertas','Ativa') and not public.my_creator_limited()) or public.creator_in_campaign(id))));

-- Grupos da comunidade: só para a base completa
drop policy if exists cl_sel on public.community_links;
create policy cl_sel on public.community_links for select using (
  public.is_staff()
  or (audience in ('Todos','Creators') and public.my_creator() is not null and not public.my_creator_limited())
  or (audience in ('Todos','Marcas') and public.my_brand() is not null));

-- A creator não muda sozinha se é "só da marca"
create or replace function public.guard_creator() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' or public.can_mod('creators') or current_setting('cx.points', true) = '1' then return new; end if;
  if new.xp is distinct from old.xp or new.status is distinct from old.status or new.tags is distinct from old.tags or new.brand_only is distinct from old.brand_only then
    raise exception 'Sem permissão para alterar estes dados';
  end if;
  return new;
end $$;

-- ---------- Formulário da marca: a marca vê o formulário e as respostas ----------
drop policy if exists cy_form_sel on public.forms;
create policy cy_form_sel on public.forms for select using (public.can_mod('formularios') or status = 'Publicado' or (brand_id is not null and brand_id = public.my_brand()));
drop policy if exists cy_fr_sel on public.form_responses;
create policy cy_fr_sel on public.form_responses for select using (public.can_mod('formularios')
  or exists(select 1 from forms f where f.id = form_id and f.brand_id is not null and f.brand_id = public.my_brand()));

-- Avisos: equipe + a marca dona do formulário
create or replace function public.tg_form_response() returns trigger language plpgsql security definer set search_path = public as $$
declare f record; who text;
begin
  select title, brand_id into f from forms where id = new.form_id;
  select name into who from creators where id = new.creator_id;
  perform public.notify_staff('formularios', '📋 Nova resposta no formulário ' || coalesce(f.title, '') || coalesce(' · ' || who, '')
    || case when new.join_conecta then ' (entrou também na base da Conecta)' else '' end, '/formularios/' || new.form_id || '?tab=respostas');
  if f.brand_id is not null then
    insert into notifications (user_id, text, link)
    select p.id, '📋 Nova resposta no formulário ' || coalesce(f.title, '') || coalesce(' · ' || who, ''), '/portal/formularios?f=' || new.form_id
    from profiles p where p.role = 'marca' and p.status = 'ativo' and p.brand_id = f.brand_id;
  end if;
  return new;
end $$;
