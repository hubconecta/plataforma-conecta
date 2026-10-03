-- =====================================================================
-- CONECTA · Banco de dados · Entrega 1 (Fundação)
-- Cole este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Pode rodar de novo sem problema: ele não apaga dados existentes.
-- Regras de acesso ficam no próprio banco (RLS): uma marca nunca vê
-- dados de outra, creators só veem o que é delas e a equipe só vê o
-- financeiro com permissão.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Perfis (1 por login) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'pendente' check (role in ('pendente','ceo','equipe','financeiro','marca','creator')),
  status text not null default 'ativo' check (status in ('ativo','inativo','bloqueado')),
  perms text[] not null default '{}',          -- permissões individuais da equipe
  brand_id uuid,                                -- perfil marca
  creator_id uuid,                              -- perfil creator
  cargo text, departamento text, whatsapp text, responsabilidades text,
  entrada date,
  access_status text not null default 'ativo',  -- convite_enviado, primeiro_acesso_pendente, ativo, bloqueado, desativado
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Marcas (cliente) ----------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  razao_social text, cnpj text, segment text, category text,
  site text, instagram text, tiktok text,
  contact_name text, contact_role text, email text, phone text, whatsapp text,
  address text, city text, state text, zip text,
  start_date date, renewal_date date, contract_type text, hiring_model text, billing_model text,
  owner_id uuid references public.profiles(id),
  status text not null default 'Lead',
  notes text,
  created_at timestamptz not null default now()
);

-- Valores do contrato ficam separados: só CEO e quem tem permissão financeira veem
create table if not exists public.brand_contracts (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  monthly_value numeric(12,2), commission_pct numeric(5,2), due_day int,
  updated_at timestamptz not null default now()
);

-- ---------- Creators ----------
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  artist_name text, email text, whatsapp text,
  city text, state text,
  instagram text, tiktok text, youtube text,
  followers int default 0,
  niche text, categories text[] default '{}', kind text,
  status text not null default 'Nova',
  tags text[] default '{}',
  clothing_size text,
  xp int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_brand_fk;
alter table public.profiles add constraint profiles_brand_fk foreign key (brand_id) references public.brands(id) on delete set null;
alter table public.profiles drop constraint if exists profiles_creator_fk;
alter table public.profiles add constraint profiles_creator_fk foreign key (creator_id) references public.creators(id) on delete set null;

-- Endereço separado (dado pessoal): só a própria creator e a CEO nesta etapa
create table if not exists public.creator_addresses (
  creator_id uuid primary key references public.creators(id) on delete cascade,
  recipient text, phone text, zip text, street text, number text, complement text,
  district text, city text, state text,
  updated_at timestamptz not null default now()
);

-- ---------- Cadastro público de creators ----------
create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'Nova' check (status in ('Nova','Em análise','Aprovada','Rejeitada')),
  name text not null, email text not null, whatsapp text, city text, state text,
  instagram text, tiktok text, niche text, kind text,
  answers jsonb not null default '{}',     -- todas as respostas do formulário
  tags text[] not null default '{}',
  creator_id uuid references public.creators(id),
  created_at timestamptz not null default now()
);

-- ---------- Campanhas e inscrições ----------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null, product text, objective text, description text, briefing text,
  status text not null default 'Futura' check (status in ('Futura','Inscrições abertas','Ativa','Encerrada')),
  start_date date, end_date date, slots int default 10,
  fee numeric(12,2), commission_pct numeric(5,2), niche text,
  requirements text, deliverables text,
  requires_shipping boolean not null default false,
  results jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  status text not null default 'Enviada' check (status in ('Enviada','Em análise','Aprovada','Reprovada','Lista de espera')),
  answers jsonb not null default '{}',
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

-- ---------- Notificações e histórico ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null, link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  who text, action text not null, module text, entity_id uuid,
  financial boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Funções de permissão (usadas pelas regras RLS)
-- =====================================================================
create or replace function public.is_ceo() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'ceo' and status = 'ativo');
$$;
create or replace function public.can_mod(m text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles p where p.id = auth.uid() and p.status = 'ativo' and (
    p.role = 'ceo'
    or (p.role = 'equipe' and m = any(p.perms))
    or (p.role = 'financeiro' and m in ('fin','vendas','cobrancas'))));
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and status = 'ativo' and role in ('ceo','equipe','financeiro'));
$$;
create or replace function public.my_brand() returns uuid language sql stable security definer set search_path = public as $$
  select brand_id from profiles where id = auth.uid() and role = 'marca' and status = 'ativo';
$$;
create or replace function public.my_creator() returns uuid language sql stable security definer set search_path = public as $$
  select creator_id from profiles where id = auth.uid() and role = 'creator' and status = 'ativo';
$$;

-- Ajudantes sem recursão entre regras
create or replace function public.creator_in_campaign(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from campaign_applications a where a.campaign_id = c and a.creator_id = public.my_creator());
$$;
create or replace function public.campaign_of_my_brand(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from campaigns x where x.id = c and x.brand_id = public.my_brand());
$$;
create or replace function public.creator_works_for_my_brand(cr uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from campaign_applications a join campaigns c on c.id = a.campaign_id where a.creator_id = cr and a.status = 'Aprovada' and c.brand_id = public.my_brand());
$$;

-- Novo login → cria o perfil sem acesso ("pendente"). Quem define o papel é a Conecta.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Ninguém muda o próprio papel/permissões; só a CEO (ou o servidor)
create or replace function public.guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- sem login (SQL Editor do Supabase) ou servidor: permitido. Usuário comum: só a CEO.
  if auth.uid() is null or auth.role() = 'service_role' or public.is_ceo() then return new; end if;
  if new.role is distinct from old.role or new.perms is distinct from old.perms or new.status is distinct from old.status
     or new.brand_id is distinct from old.brand_id or new.creator_id is distinct from old.creator_id or new.access_status is distinct from old.access_status then
    raise exception 'Sem permissão para alterar perfil de acesso';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

-- =====================================================================
-- Regras de acesso (RLS)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.brand_contracts enable row level security;
alter table public.creators enable row level security;
alter table public.creator_addresses enable row level security;
alter table public.creator_applications enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and policyname like 'cx_%' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy cx_profiles_sel on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy cx_profiles_upd on public.profiles for update using (id = auth.uid() or public.is_ceo());

-- brands: equipe com permissão "marcas" ou a própria marca
create policy cx_brands_sel on public.brands for select using (public.can_mod('marcas') or id = public.my_brand() or public.can_mod('campanhas'));
create policy cx_brands_ins on public.brands for insert with check (public.can_mod('marcas'));
create policy cx_brands_upd on public.brands for update using (public.can_mod('marcas'));
create policy cx_brands_del on public.brands for delete using (public.is_ceo());

-- valores de contrato: só financeiro autorizado
create policy cx_contracts_all on public.brand_contracts for all using (public.can_mod('fin')) with check (public.can_mod('fin'));

-- creators
create policy cx_creators_sel on public.creators for select using (public.can_mod('creators') or public.can_mod('candidaturas') or id = public.my_creator()
  or (public.my_brand() is not null and public.creator_works_for_my_brand(id)));
create policy cx_creators_ins on public.creators for insert with check (public.can_mod('creators') or public.can_mod('cad_creators'));
create policy cx_creators_upd on public.creators for update using (public.can_mod('creators') or id = public.my_creator());

-- endereço
create policy cx_addr_all on public.creator_addresses for all using (public.is_ceo() or creator_id = public.my_creator()) with check (public.is_ceo() or creator_id = public.my_creator());

-- cadastro público: qualquer pessoa envia, só a equipe lê
create policy cx_apps_ins on public.creator_applications for insert with check (status = 'Nova' and creator_id is null);
create policy cx_apps_sel on public.creator_applications for select using (public.can_mod('cad_creators'));
create policy cx_apps_upd on public.creator_applications for update using (public.can_mod('cad_creators'));

-- campanhas
create policy cx_camp_sel on public.campaigns for select using (public.can_mod('campanhas') or brand_id = public.my_brand()
  or (public.my_creator() is not null and (status in ('Inscrições abertas','Ativa') or public.creator_in_campaign(id))));
create policy cx_camp_ins on public.campaigns for insert with check (public.can_mod('campanhas'));
create policy cx_camp_upd on public.campaigns for update using (public.can_mod('campanhas'));

-- inscrições
create policy cx_capps_sel on public.campaign_applications for select using (public.can_mod('candidaturas') or public.can_mod('campanhas') or creator_id = public.my_creator()
  or (status = 'Aprovada' and public.campaign_of_my_brand(campaign_id)));
create policy cx_capps_ins on public.campaign_applications for insert with check (creator_id = public.my_creator() and status = 'Enviada');
create policy cx_capps_upd on public.campaign_applications for update using (public.can_mod('candidaturas'));

-- notificações: cada um vê as suas; a equipe pode criar
create policy cx_notif_sel on public.notifications for select using (user_id = auth.uid());
create policy cx_notif_upd on public.notifications for update using (user_id = auth.uid());
create policy cx_notif_ins on public.notifications for insert with check (public.is_staff() or user_id = auth.uid());

-- histórico: todos registram as próprias ações, só a CEO lê
create policy cx_audit_ins on public.audit_logs for insert with check (user_id = auth.uid());
create policy cx_audit_sel on public.audit_logs for select using (public.is_ceo());

-- Avisar a equipe quando chega cadastro novo (roda com permissão do banco)
create or replace function public.notify_new_application() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, text, link)
  select p.id, 'Nova creator cadastrada: ' || new.name, '/cadastros'
  from profiles p where p.status = 'ativo' and (p.role = 'ceo' or (p.role = 'equipe' and 'cad_creators' = any(p.perms)));
  return new;
end $$;
drop trigger if exists creator_app_notify on public.creator_applications;
create trigger creator_app_notify after insert on public.creator_applications for each row execute function public.notify_new_application();

-- Nome e @ da marca visíveis para creators (sem contatos internos)
create or replace view public.brand_public as select id, name, instagram, category from public.brands;
grant select on public.brand_public to authenticated;
