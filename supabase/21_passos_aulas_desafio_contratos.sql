-- =====================================================================
-- CONECTA · Próximos passos da campanha, aulas, desafio diário com
-- ranking e contratos com assinatura dentro da plataforma.
-- Rode depois do 20. Pode rodar de novo sem problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Próximos passos da campanha (links que a aprovada recebe, em ordem)
--    Ex.: 1. Cadastre-se como afiliada  2. Entre no grupo do WhatsApp
-- ---------------------------------------------------------------------
create table if not exists public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  url text,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.campaign_steps enable row level security;
drop policy if exists cst_sel on public.campaign_steps; drop policy if exists cst_all on public.campaign_steps;
create policy cst_sel on public.campaign_steps for select using (public.can_mod('campanhas') or public.campaign_of_my_brand(campaign_id) or public.creator_approved_in(campaign_id));
create policy cst_all on public.campaign_steps for all using (public.can_mod('campanhas')) with check (public.can_mod('campanhas'));

-- ao ser aprovada, a creator recebe o aviso com o primeiro passo
create or replace function public.tg_steps_invite() returns trigger language plpgsql security definer set search_path = public as $$
declare st record; cn text;
begin
  if new.status = 'Aprovada' and old.status is distinct from 'Aprovada' then
    select * into st from campaign_steps where campaign_id = new.campaign_id order by position, created_at limit 1;
    if st is not null then
      select name into cn from campaigns where id = new.campaign_id;
      insert into notifications (user_id, text, link)
      select p.id, '👉 Próximo passo na campanha ' || coalesce(cn, '') || ': ' || st.title, '/clube/minhas'
      from profiles p where p.creator_id = new.creator_id and p.role = 'creator' and p.status = 'ativo';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists steps_invite on public.campaign_applications;
create trigger steps_invite after update of status on public.campaign_applications for each row execute function public.tg_steps_invite();

-- ---------------------------------------------------------------------
-- 2) Aulas / lives (da marca ou da Conecta)
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  title text not null,
  theme text,
  starts_at timestamptz not null,
  duration_min int default 60,
  url text,
  audience text not null default 'Creators da marca' check (audience in ('Creators da marca','Todas as creators')),
  status text not null default 'Agendada' check (status in ('Agendada','Cancelada','Realizada')),
  recording_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create or replace function public.class_visible_to_me(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from classes x where x.id = c and (
    (public.my_brand() is not null and x.brand_id = public.my_brand())
    or (public.my_creator() is not null and (
         (x.audience = 'Todas as creators' and not public.my_creator_limited())
         or x.brand_id is null and not public.my_creator_limited()
         or (x.brand_id is not null and public.creator_of_brand(x.brand_id))))));
$$;
alter table public.classes enable row level security;
drop policy if exists cls_sel on public.classes; drop policy if exists cls_all on public.classes;
create policy cls_sel on public.classes for select using (public.is_staff() or public.class_visible_to_me(id));
create policy cls_all on public.classes for all using (public.can_mod('campanhas') or public.can_mod('marcas')) with check (public.can_mod('campanhas') or public.can_mod('marcas'));

-- ---------------------------------------------------------------------
-- 3) Desafio diário: a creator lança os conteúdos/vendas dia a dia
-- ---------------------------------------------------------------------
create table if not exists public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind text not null default 'Vídeo' check (kind in ('Vídeo','Reels','Stories','TikTok','Carrossel','Live','Venda','Outro')),
  qty int not null default 1 check (qty between 0 and 1000),
  sales numeric(12,2) not null default 0,
  link text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ix_ch_entries on public.challenge_entries (challenge_id, creator_id, day);
alter table public.challenge_entries enable row level security;
drop policy if exists che_sel on public.challenge_entries; drop policy if exists che_ins on public.challenge_entries; drop policy if exists che_del on public.challenge_entries; drop policy if exists che_st on public.challenge_entries;
create policy che_sel on public.challenge_entries for select using (public.can_mod('desafios') or creator_id = public.my_creator() or public.challenge_of_my_brand(challenge_id));
create policy che_ins on public.challenge_entries for insert with check (creator_id = public.my_creator() and public.challenge_open(challenge_id)
  and exists(select 1 from challenge_participants p where p.challenge_id = challenge_entries.challenge_id and p.creator_id = public.my_creator()));
create policy che_del on public.challenge_entries for delete using ((creator_id = public.my_creator() and public.challenge_open(challenge_id)) or public.can_mod('desafios'));
create policy che_st on public.challenge_entries for update using (public.can_mod('desafios')) with check (public.can_mod('desafios'));

-- o progresso da participante = soma dos conteúdos lançados (vendas contam à parte)
create or replace function public.tg_entry_progress() returns trigger language plpgsql security definer set search_path = public as $$
declare ch uuid := coalesce(new.challenge_id, old.challenge_id); cr uuid := coalesce(new.creator_id, old.creator_id); tot int;
begin
  select coalesce(sum(qty), 0) into tot from challenge_entries where challenge_id = ch and creator_id = cr and kind <> 'Venda';
  update challenge_participants set progress = tot where challenge_id = ch and creator_id = cr;
  return null;
end $$;
drop trigger if exists entry_progress on public.challenge_entries;
create trigger entry_progress after insert or update or delete on public.challenge_entries for each row execute function public.tg_entry_progress();

-- Ranking do desafio (mostra só nome artístico/primeiro nome, foto e números)
create or replace function public.challenge_ranking(ch uuid)
returns table (pos int, creator_id uuid, display_name text, avatar_path text, contents int, sales numeric, entries int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with ok as (
    select 1 where public.can_mod('desafios') or public.challenge_of_my_brand(ch)
      or exists(select 1 from challenge_participants p where p.challenge_id = ch and p.creator_id = public.my_creator())
      or public.challenge_visible_to_me(ch)
  ), agg as (
    select p.creator_id,
      coalesce(sum(e.qty) filter (where e.kind <> 'Venda'), 0)::int as contents,
      coalesce(sum(e.sales), 0) as sales,
      count(e.id)::int as entries
    from challenge_participants p
    left join challenge_entries e on e.challenge_id = p.challenge_id and e.creator_id = p.creator_id
    where p.challenge_id = ch
    group by p.creator_id
  )
  select (row_number() over (order by
            case when (select type from challenges where id = ch) in ('Vendas','Conversão','Afiliados') then a.sales else a.contents end desc,
            a.contents desc, a.sales desc))::int,
    case when public.can_mod('desafios') or public.challenge_of_my_brand(ch) then a.creator_id else null end,
    coalesce(nullif(c.artist_name, ''), split_part(c.name, ' ', 1) || coalesce(' ' || left(nullif(split_part(c.name, ' ', 2), ''), 1) || '.', '')),
    c.avatar_path, a.contents, a.sales, a.entries, a.creator_id = public.my_creator()
  from agg a join creators c on c.id = a.creator_id
  where exists(select 1 from ok);
$$;
grant execute on function public.challenge_ranking(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) Contratos da campanha com assinatura eletrônica (creator e marca)
-- ---------------------------------------------------------------------
create table if not exists public.campaign_contracts (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  title text not null default 'Contrato de participação e cessão de uso de imagem',
  body text not null,
  brand_signs boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.campaign_contracts enable row level security;
drop policy if exists cct_sel on public.campaign_contracts; drop policy if exists cct_all on public.campaign_contracts;
create policy cct_sel on public.campaign_contracts for select using (public.can_mod('campanhas') or public.campaign_of_my_brand(campaign_id) or public.creator_approved_in(campaign_id));
create policy cct_all on public.campaign_contracts for all using (public.can_mod('campanhas')) with check (public.can_mod('campanhas'));

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null,
  body text not null,                       -- texto exato que foi assinado
  status text not null default 'Aguardando creator' check (status in ('Aguardando creator','Aguardando marca','Assinado','Cancelado')),
  creator_name text, creator_doc text, creator_signed_at timestamptz, creator_ip text, creator_agent text,
  brand_signer text, brand_signer_role text, brand_signed_at timestamptz, brand_ip text, brand_agent text,
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
alter table public.contract_signatures enable row level security;
drop policy if exists csg_sel on public.contract_signatures; drop policy if exists csg_all on public.contract_signatures;
create policy csg_sel on public.contract_signatures for select using (public.can_mod('campanhas') or public.campaign_of_my_brand(campaign_id) or creator_id = public.my_creator());
create policy csg_all on public.contract_signatures for all using (public.can_mod('campanhas')) with check (public.can_mod('campanhas'));
-- (assinaturas da creator e da marca são gravadas pelo servidor, com data, IP e aparelho)
