-- =====================================================================
-- CONECTA · CONECTA HUB (assinatura mensal das creators)
-- Planos (Free / Hub), assinaturas, histórico de eventos (idempotente),
-- regra única de acesso "tem Hub ativo?" usada em todas as áreas premium,
-- conteúdos exclusivos (TikTok Shop, Instagram, Comunidade, Materiais),
-- Conecta Academy (usa a estrutura do Club Criadora) e itens "exclusivo Hub"
-- em campanhas, desafios, aulas e grupos.
-- Nada é apagado. Rode depois do 22. Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- Planos ----------
create table if not exists public.plans (
  code text primary key,
  name text not null,
  price numeric(12,2) not null default 0,
  interval_months int not null default 1,
  features text[] not null default '{}',
  active boolean not null default true,
  position int not null default 0
);
insert into public.plans (code, name, price, interval_months, features, position) values
  ('free', 'Creator Free', 0, 1, '{}', 1),
  ('hub', 'Conecta Hub', 37, 1, '{campanhas_exclusivas,comunidade,tiktok,instagram,academy,desafios_exclusivos,materiais}', 2)
on conflict (code) do nothing;

-- ---------- Assinaturas (uma por creator e plano; o histórico fica nos eventos) ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status text not null default 'pendente' check (status in ('pendente','ativa','em_atraso','cancelada','expirada','reembolsada')),
  provider text not null default 'B4YOU',
  provider_ref text,                 -- código da assinatura/pedido no gateway
  email text,
  started_at timestamptz,
  current_period_end timestamptz,    -- até quando está pago
  grace_until timestamptz,           -- carência no atraso
  canceled_at timestamptz,
  last_payment_at timestamptz,
  last_amount numeric(12,2),
  manual boolean not null default false,
  manual_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, plan_code)
);
create index if not exists ix_subs_status on public.subscriptions (plan_code, status);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete set null,
  kind text not null,                -- pagamento, renovacao, atraso, cancelamento, reembolso, expiracao, manual_liberar, manual_retirar, pendente…
  event_key text unique,             -- evita processar o mesmo aviso duas vezes
  amount numeric(12,2),
  b4_event_id uuid,
  note text,
  by_profile uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- vendas do Hub entram no financeiro
alter table public.sales drop constraint if exists sales_kind_check;
alter table public.sales add constraint sales_kind_check check (kind in ('Club Criadora','Comissão de marca','Press kit','Conecta Hub','Outro'));

-- Configuração do Hub (preço, checkout, ID do produto na B4YOU, dias de carência)
insert into public.settings (key, value) values ('hub', '{"price": 37, "grace_days": 3, "checkout_url": "", "b4you_product": "", "launched": false}')
on conflict (key) do nothing;

-- ---------- Regra única de acesso ----------
create or replace function public.hub_grace_days() returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value->>'grace_days')::int from settings where key = 'hub'), 3);
$$;

create or replace function public.creator_has_hub(cr uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from subscriptions s where s.creator_id = cr and s.plan_code = 'hub'
    and s.status in ('ativa','em_atraso','cancelada')
    and now() <= coalesce(s.grace_until, s.current_period_end + make_interval(days => case when s.status = 'cancelada' or s.manual then 0 else public.hub_grace_days() end), 'infinity'::timestamptz));
$$;

create or replace function public.my_hub() returns boolean language sql stable security definer set search_path = public as $$
  select public.my_creator() is not null and public.creator_has_hub(public.my_creator());
$$;
grant execute on function public.my_hub() to authenticated;

-- Situação da assinatura da própria creator (para a tela "Minha assinatura")
create or replace function public.my_subscription() returns table (status text, active boolean, started_at timestamptz, current_period_end timestamptz, grace_until timestamptz, canceled_at timestamptz, manual boolean)
language sql stable security definer set search_path = public as $$
  select s.status, public.creator_has_hub(s.creator_id), s.started_at, s.current_period_end, s.grace_until, s.canceled_at, s.manual
  from subscriptions s where s.creator_id = public.my_creator() and s.plan_code = 'hub';
$$;
grant execute on function public.my_subscription() to authenticated;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
drop policy if exists pl_sel on public.plans; drop policy if exists pl_all on public.plans;
create policy pl_sel on public.plans for select using (auth.uid() is not null);
create policy pl_all on public.plans for all using (public.is_ceo()) with check (public.is_ceo());
drop policy if exists sub_sel on public.subscriptions; drop policy if exists sub_all on public.subscriptions;
create policy sub_sel on public.subscriptions for select using (public.can_mod('assinaturas') or public.can_mod('fin') or creator_id = public.my_creator());
create policy sub_all on public.subscriptions for all using (public.can_mod('assinaturas')) with check (public.can_mod('assinaturas'));
drop policy if exists sev_sel on public.subscription_events; drop policy if exists sev_all on public.subscription_events;
create policy sev_sel on public.subscription_events for select using (public.can_mod('assinaturas') or public.can_mod('fin') or creator_id = public.my_creator());
create policy sev_all on public.subscription_events for all using (public.can_mod('assinaturas')) with check (public.can_mod('assinaturas'));

-- ---------- "Exclusivo Hub" em campanhas, desafios, aulas e grupos ----------
alter table public.campaigns add column if not exists access_level text not null default 'todas';
alter table public.challenges add column if not exists access_level text not null default 'todas';
alter table public.classes add column if not exists access_level text not null default 'todas';
do $$ begin
  begin alter table public.campaigns add constraint campaigns_access_chk check (access_level in ('todas','hub')); exception when duplicate_object then null; end;
  begin alter table public.challenges add constraint challenges_access_chk check (access_level in ('todas','hub')); exception when duplicate_object then null; end;
  begin alter table public.classes add constraint classes_access_chk check (access_level in ('todas','hub')); exception when duplicate_object then null; end;
end $$;

alter table public.community_links drop constraint if exists community_links_audience_check;
alter table public.community_links add constraint community_links_audience_check check (audience in ('Todos','Creators','Hub','Marcas','Equipe'));

-- Campanhas: exclusivas do Hub só para assinantes (quem já está na campanha continua vendo)
drop policy if exists cx_camp_sel on public.campaigns;
create policy cx_camp_sel on public.campaigns for select using (public.can_mod('campanhas') or brand_id = public.my_brand()
  or (public.my_creator() is not null and (
        (status in ('Inscrições abertas','Ativa')
          and (not public.my_creator_limited() or brand_id in (select public.my_creator_brands()))
          and (access_level = 'todas' or public.my_hub()))
        or public.creator_in_campaign(id))));

-- Inscrição: só em campanha aberta que ela pode ver (bloqueia inscrição "por fora" em campanha do Hub)
drop policy if exists cx_capps_ins on public.campaign_applications;
create policy cx_capps_ins on public.campaign_applications for insert with check (creator_id = public.my_creator() and status = 'Enviada'
  and exists(select 1 from campaigns c where c.id = campaign_id and c.status = 'Inscrições abertas' and (c.access_level = 'todas' or public.my_hub())));

-- Desafios
create or replace function public.challenge_visible_to_me(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.status in ('Ativo','Encerrado') and public.my_creator() is not null
    and (
      exists(select 1 from challenge_participants p where p.challenge_id = x.id and p.creator_id = public.my_creator())
      or (
        (not public.my_creator_limited() or x.brand_id in (select public.my_creator_brands()))
        and (x.audience <> 'Creators da base da marca' or x.brand_id in (select public.my_creator_brands()))
        and (x.audience not like 'Participantes%' or x.campaign_id is null or public.creator_approved_in(x.campaign_id))
        and (x.access_level = 'todas' or public.my_hub()))));
$$;

-- Aulas
create or replace function public.class_visible_to_me(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from classes x where x.id = c and (
    (public.my_brand() is not null and x.brand_id = public.my_brand())
    or (public.my_creator() is not null and (x.access_level = 'todas' or public.my_hub()) and (
         (x.audience = 'Todas as creators' and not public.my_creator_limited())
         or x.brand_id is null and not public.my_creator_limited()
         or (x.brand_id is not null and public.creator_of_brand(x.brand_id))))));
$$;

-- Grupos da comunidade: audiência "Hub" só para assinantes
drop policy if exists cl_sel on public.community_links;
create policy cl_sel on public.community_links for select using (
  public.is_staff()
  or (audience in ('Todos','Creators') and public.my_creator() is not null and not public.my_creator_limited())
  or (audience = 'Hub' and public.my_hub())
  or (audience in ('Todos','Marcas') and public.my_brand() is not null));

-- ---------- Conteúdos do Hub (TikTok Shop, Instagram, Comunidade, Materiais) ----------
create table if not exists public.hub_items (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('tiktok','instagram','comunidade','materiais')),
  category text,
  kind text not null default 'Conteúdo' check (kind in ('Oportunidade','Conteúdo','Material','Link','Aviso','Produto','Vídeo')),
  title text not null,
  body text,
  url text,
  file_path text,
  pinned boolean not null default false,
  status text not null default 'Publicado' check (status in ('Rascunho','Publicado')),
  position int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.hub_items enable row level security;
drop policy if exists hi_sel on public.hub_items; drop policy if exists hi_all on public.hub_items;
create policy hi_sel on public.hub_items for select using (public.can_mod('assinaturas') or public.can_mod('campanhas') or (status = 'Publicado' and public.my_hub()));
create policy hi_all on public.hub_items for all using (public.can_mod('assinaturas') or public.can_mod('campanhas')) with check (public.can_mod('assinaturas') or public.can_mod('campanhas'));

-- Prévia para a creator Free: só quantidades (nenhum dado premium)
create or replace function public.hub_teasers() returns table (area text, total int) language sql stable security definer set search_path = public as $$
  select 'campanhas', count(*)::int from campaigns where access_level = 'hub' and status in ('Inscrições abertas','Ativa')
  union all select 'desafios', count(*)::int from challenges where access_level = 'hub' and status = 'Ativo'
  union all select 'aulas', count(*)::int from classes where access_level = 'hub' and status = 'Agendada' and starts_at > now()
  union all select x.section, count(*)::int from hub_items x where x.status = 'Publicado' group by x.section;
$$;
grant execute on function public.hub_teasers() to authenticated;

-- ---------- Conecta Academy (usa a estrutura de módulos e aulas do Club Criadora) ----------
insert into public.products (title, slug, tagline, description, status, position, color)
values ('Conecta Academy', 'conecta-academy', 'A escola das creators do Conecta Hub', 'Cursos, aulas, trilhas e materiais exclusivos para assinantes do Conecta Hub.', 'Publicado', 99, '#E6007E')
on conflict (slug) do nothing;

create or replace function public.has_product(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from method_purchases x where x.creator_id = public.my_creator() and x.product_id = p and x.status = 'Pago')
    or (public.my_hub() and exists(select 1 from products y where y.id = p and y.slug = 'conecta-academy'));
$$;

-- ---------- Avisos para a equipe sobre ações no Conecta Hub ----------
create or replace function public.audit_mod(label text) returns text language sql immutable as $$
  select case label
    when 'Tarefas' then 'demandas' when 'Calendário' then 'calendario' when 'Campanhas' then 'campanhas'
    when 'Inscrições' then 'candidaturas' when 'Desafios' then 'desafios' when 'Conteúdos' then 'conteudos'
    when 'Press kits' then 'presskits' when 'Envios' then 'amostras' when 'Formulários' then 'formularios'
    when 'Leads' then 'crm' when 'Relatórios' then 'relatorios' when 'Marcas' then 'marcas' when 'Acesso da marca' then 'marcas'
    when 'Creators' then 'creators' when 'Cadastros de creators' then 'cad_creators' when 'Níveis e pontos' then 'gamificacao'
    when 'Club Criadora' then 'metodo_adm' when 'Conecta Hub' then 'assinaturas' when 'Comunidade' then 'campanhas'
    when 'Financeiro' then 'fin' when 'Vendas' then 'fin' when 'Cobranças' then 'fin'
    when 'Acessos' then 'so_ceo' when 'Colaboradoras' then 'so_ceo' when 'Configurações' then 'so_ceo' when 'Integrações' then 'so_ceo'
  end;
$$;

create or replace function public.mod_link(m text) returns text language sql immutable as $$
  select case m
    when 'demandas' then '/tarefas' when 'calendario' then '/calendario' when 'campanhas' then '/campanhas'
    when 'candidaturas' then '/inscricoes' when 'desafios' then '/desafios' when 'conteudos' then '/conteudos'
    when 'presskits' then '/presskits' when 'amostras' then '/envios' when 'formularios' then '/formularios'
    when 'crm' then '/leads' when 'relatorios' then '/relatorios' when 'marcas' then '/marcas' when 'creators' then '/creators'
    when 'cad_creators' then '/cadastros' when 'gamificacao' then '/gamificacao' when 'metodo_adm' then '/club/admin'
    when 'fin' then '/financeiro' when 'assinaturas' then '/assinaturas' else '/historico' end;
$$;

