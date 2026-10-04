-- =====================================================================
-- CONECTA · Entrega 2 · Todos os módulos de operação
-- Rode DEPOIS do 01_fundacao.sql. Pode rodar de novo sem problema.
-- Desafios, relatórios, leads, tarefas, conteúdos, press kits, envios,
-- formulários, financeiro, Método e campanhas propostas pela marca.
-- =====================================================================

-- ---------- Campanhas propostas pela marca ----------
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('Em aprovação','Ajuste solicitado','Recusada','Futura','Inscrições abertas','Ativa','Encerrada'));
alter table public.campaigns add column if not exists proposed_by uuid references public.profiles(id) on delete set null;
alter table public.campaigns add column if not exists review_note text;
alter table public.campaigns add column if not exists budget numeric(12,2);
alter table public.campaigns add column if not exists pk_id uuid;

-- Creator não altera pontos, status nem tags dela mesma
create or replace function public.guard_creator() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' or public.can_mod('creators') then return new; end if;
  if new.xp is distinct from old.xp or new.status is distinct from old.status or new.tags is distinct from old.tags then
    raise exception 'Sem permissão para alterar estes dados';
  end if;
  return new;
end $$;
drop trigger if exists creators_guard on public.creators;
create trigger creators_guard before update on public.creators for each row execute function public.guard_creator();

-- ---------- Desafios ----------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null, description text, objective text, rules text, criteria text, evidence text, regulation text,
  type text not null default 'Conteúdo' check (type in ('Conteúdo','Vendas','Afiliados','Engajamento','Publicação','UGC','Conversão','Presença','Outro')),
  status text not null default 'Rascunho' check (status in ('Em aprovação','Ajuste solicitado','Recusado','Rascunho','Agendado','Ativo','Pausado','Encerrado')),
  audience text not null default 'Todas as creators',
  start_date date, due_date date,
  target int not null default 1 check (target >= 1),
  points int not null default 0,
  winners int not null default 0,
  reward_type text default 'Produto' check (reward_type in ('Dinheiro','Produto','Voucher','Comissão extra','Press kit','Experiência','Acesso a curso','Benefício exclusivo')),
  reward_label text, reward_value numeric(12,2),
  result jsonb,
  review_note text,
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (due_date is null or start_date is null or due_date >= start_date)
);

create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  progress int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, creator_id)
);

create table if not exists public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  status text not null default 'Enviado' check (status in ('Enviado','Em análise','Aprovado','Ajuste necessário','Reprovado')),
  evidence text, link text, note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, creator_id)
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  title text not null, type text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  challenge_id uuid references public.challenges(id) on delete set null,
  value numeric(12,2),
  status text not null default 'Aprovada' check (status in ('Pendente','Aprovada','Liberada','Paga','Entregue')),
  created_at timestamptz not null default now()
);

create table if not exists public.points_log (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  points int not null, reason text,
  created_at timestamptz not null default now()
);

-- ---------- Relatório vivo da marca ----------
create table if not exists public.report_entries (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('Campanha','Desafio','Destaque')),
  ref_id uuid, title text not null, summary text, by_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null, period text, data jsonb not null default '{}', campaigns jsonb not null default '[]', by_name text,
  created_at timestamptz not null default now()
);

-- ---------- Leads de marcas (CRM) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company text not null, brand_name text, cnpj text, site text, instagram text, tiktok text,
  segment text, category text, city text, state text,
  contact text not null, contact_role text, email text, phone text,
  interests text[] not null default '{}', objective text,
  budget jsonb not null default '{}',
  source text not null default 'Cadastro manual' check (source in ('Formulário Para Marcas','Indicação','Instagram','Cadastro manual')),
  owner_id uuid references public.profiles(id) on delete set null,
  value numeric(12,2),
  stage text not null default 'Novo Lead' check (stage in ('Novo Lead','Contato realizado','Reunião agendada','Proposta enviada','Em negociação','Cliente convertido','Não convertido','Follow-up futuro')),
  follow_up date, last_at timestamptz not null default now(),
  brand_id uuid references public.brands(id) on delete set null, converted_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  who text, text text not null,
  created_at timestamptz not null default now()
);

-- ---------- Tarefas ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  owner_id uuid references public.profiles(id) on delete set null,
  due date,
  prio text not null default 'Média' check (prio in ('Alta','Média','Baixa')),
  status text not null default 'A fazer' check (status in ('A fazer','Em andamento','Concluído')),
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Conteúdos ----------
create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  platform text not null default 'Instagram' check (platform in ('Instagram','TikTok','YouTube')),
  type text not null default 'Reels' check (type in ('Reels','Stories','Vídeo','Carrossel')),
  link text,
  status text not null default 'Enviado' check (status in ('Pendente','Enviado','Em análise','Ajuste solicitado','Aprovado','Publicado')),
  version int not null default 1,
  views int not null default 0, interactions int not null default 0,
  published_at date,
  history jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------- Press kits e pedidos ----------
create table if not exists public.press_kits (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null, photo_url text, description text, items text,
  qty int default 1, cost numeric(12,2), price numeric(12,2), stock int default 0,
  type text not null default 'Gratuito' check (type in ('Gratuito','Compra','Renovação','Solicitação')),
  checkout_url text, b4you_id text,
  status text not null default 'Rascunho' check (status in ('Rascunho','Ativo','Pausado','Encerrado')),
  created_at timestamptz not null default now()
);
create table if not exists public.pk_orders (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  pk_id uuid not null references public.press_kits(id) on delete cascade,
  value numeric(12,2), order_code text,
  payment text not null default 'Gratuito' check (payment in ('Pago','Gratuito','Aguardando')),
  status text not null default 'Preparando' check (status in ('Disponível','Comprado','Aguardando pagamento','Pago','Preparando','Enviado','Em trânsito','Entregue','Cancelado')),
  tracking text, renew_date date,
  created_at timestamptz not null default now()
);

-- ---------- Amostras e envios ----------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  pk_order_id uuid references public.pk_orders(id) on delete set null,
  product text not null, qty int not null default 1,
  carrier text, tracking text, sent_at date, eta date, delivered_at date,
  status text not null default 'Aguardando envio' check (status in ('Aguardando envio','Preparando','Enviado','Em trânsito','Entregue','Problema','Cancelado')),
  notes text, reason text,
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Formulários ----------
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  use text not null default 'Pesquisa' check (use in ('Cadastro de creators','Candidatura de campanha','Pesquisa','Desafio','Seleção','Onboarding','Feedback')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  status text not null default 'Rascunho' check (status in ('Rascunho','Publicado','Encerrado')),
  description text,
  fields jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete set null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Financeiro ----------
create table if not exists public.fin_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('receber','pagar')),
  description text not null, ref text, party text,
  brand_id uuid references public.brands(id) on delete set null,
  category text, value numeric(12,2) not null default 0, due date,
  status text not null default 'Em aberto' check (status in ('Em aberto','Pago','Cancelado')),
  paid_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  who text, brand_id uuid references public.brands(id) on delete cascade,
  fin_id uuid references public.fin_entries(id) on delete cascade,
  message text not null, channel text not null default 'Plataforma',
  status text not null default 'Enviado', mode text not null default 'Manual',
  kind text,
  created_at timestamptz not null default now()
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  product text not null,
  sold numeric(12,2) not null default 0,
  creator_pct numeric(5,2) not null default 0,
  conecta_pct numeric(5,2) not null default 0,
  rule text default 'Produto' check (rule in ('Produto','Campanha','Contrato','Marca')),
  status text not null default 'Pendente' check (status in ('Pendente','Aprovada','Liberada','Paga','Cancelada')),
  sale_date date not null default current_date,
  source text default 'Manual', external_id text unique,
  created_at timestamptz not null default now()
);

-- Configurações (número do WhatsApp, lembretes automáticos, perguntas do formulário de leads...)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('rem', '{"before":3,"onDay":true,"after":2,"plataforma":true,"email":false}'),
  ('lead_qs', '{"hasBudget":true,"amount":true,"creators":true,"affiliates":true,"agency":true}'),
  ('whatsapp', '{"number":""}'),
  ('metodo', '{"checkout":"","price":497}')
on conflict (key) do nothing;

-- ---------- Método Criador Expert ----------
create table if not exists public.method_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, color text,
  status text not null default 'Rascunho' check (status in ('Rascunho','Publicado','Oculto')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.method_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.method_modules(id) on delete cascade,
  title text not null,
  type text not null default 'Vídeo' check (type in ('Vídeo','Material','Exercício')),
  status text not null default 'Rascunho' check (status in ('Rascunho','Publicada','Oculta')),
  duration text, description text, video_url text, pdf_url text, exercise text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.method_purchases (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  status text not null default 'Aguardando pagamento' check (status in ('Aguardando pagamento','Pago','Cancelado','Reembolsado')),
  source text not null default 'Checkout B4YOU',
  order_code text, value numeric(12,2),
  confirmed_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.method_progress (
  creator_id uuid not null references public.creators(id) on delete cascade,
  lesson_id uuid not null references public.method_lessons(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (creator_id, lesson_id)
);

-- =====================================================================
-- Ajudantes
-- =====================================================================
create or replace function public.creator_approved_in(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from campaign_applications a where a.campaign_id = c and a.creator_id = public.my_creator() and a.status = 'Aprovada');
$$;
create or replace function public.challenge_of_my_brand(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.brand_id = public.my_brand());
$$;
create or replace function public.challenge_visible_to_me(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.status in ('Ativo','Encerrado') and public.my_creator() is not null
    and (x.audience not like 'Participantes%' or x.campaign_id is null or public.creator_approved_in(x.campaign_id)
         or exists(select 1 from challenge_participants p where p.challenge_id = x.id and p.creator_id = public.my_creator())));
$$;
create or replace function public.challenge_open(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.status = 'Ativo') and public.challenge_visible_to_me(ch);
$$;
create or replace function public.pk_of_my_brand(pk uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from press_kits k where k.id = pk and k.brand_id = public.my_brand());
$$;
create or replace function public.form_published(f uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from forms x where x.id = f and x.status = 'Publicado');
$$;
create or replace function public.has_method() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from method_purchases p where p.creator_id = public.my_creator() and p.status = 'Pago');
$$;
create or replace function public.module_published(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from method_modules x where x.id = m and x.status = 'Publicado');
$$;

-- Avisa a CEO e quem da equipe tem o módulo liberado (usado só pelos gatilhos abaixo)
create or replace function public.notify_staff(m text, msg text, lnk text) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, text, link)
  select p.id, msg, lnk from profiles p
  where p.status = 'ativo' and (p.role = 'ceo' or (p.role = 'equipe' and m = any(p.perms)) or (p.role = 'financeiro' and m in ('fin','vendas','cobrancas')));
end $$;
revoke execute on function public.notify_staff(text, text, text) from public, anon, authenticated;

-- Endereço de envio: só com envio autorizado, e todo acesso fica registrado no histórico
create or replace function public.shipment_address(s uuid) returns setof public.creator_addresses language plpgsql security definer set search_path = public as $$
declare sh record; who text; cname text; ctx text;
begin
  select * into sh from shipments where id = s;
  if sh is null or sh.status = 'Cancelado' then return; end if;
  if not (public.is_ceo() or public.can_mod('amostras') or (sh.brand_id is not null and sh.brand_id = public.my_brand())) then return; end if;
  select coalesce(name, email) into who from profiles where id = auth.uid();
  select name into cname from creators where id = sh.creator_id;
  ctx := coalesce((select 'campanha ' || name from campaigns where id = sh.campaign_id),
                  (select 'press kit ' || k.name from pk_orders o join press_kits k on k.id = o.pk_id where o.id = sh.pk_order_id),
                  'envio avulso ' || sh.product);
  insert into audit_logs (user_id, who, action, module, entity_id)
  values (auth.uid(), who, 'acessou os dados de envio da creator ' || coalesce(cname, '') || ' referente à ' || ctx, 'Dados de envio', s);
  return query select * from creator_addresses where creator_id = sh.creator_id;
end $$;
revoke execute on function public.shipment_address(uuid) from public, anon;
grant execute on function public.shipment_address(uuid) to authenticated;

-- =====================================================================
-- Gatilhos de aviso
-- =====================================================================
create or replace function public.tg_campaign_proposal() returns trigger language plpgsql security definer set search_path = public as $$
declare bname text;
begin
  if new.status = 'Em aprovação' and (tg_op = 'INSERT' or old.status is distinct from 'Em aprovação') then
    select name into bname from brands where id = new.brand_id;
    perform public.notify_staff('campanhas', '📝 Campanha enviada para aprovação: ' || new.name || ' (' || coalesce(bname, 'marca') || ')', '/campanhas');
  end if;
  return new;
end $$;
drop trigger if exists campaign_proposal on public.campaigns;
create trigger campaign_proposal after insert or update of status on public.campaigns for each row execute function public.tg_campaign_proposal();

create or replace function public.tg_challenge_proposal() returns trigger language plpgsql security definer set search_path = public as $$
declare bname text;
begin
  if new.status = 'Em aprovação' and (tg_op = 'INSERT' or old.status is distinct from 'Em aprovação') then
    select name into bname from brands where id = new.brand_id;
    perform public.notify_staff('desafios', '📝 Desafio enviado para aprovação: ' || new.name || ' (' || coalesce(bname, 'marca') || ')', '/desafios');
  end if;
  return new;
end $$;
drop trigger if exists challenge_proposal on public.challenges;
create trigger challenge_proposal after insert or update of status on public.challenges for each row execute function public.tg_challenge_proposal();

create or replace function public.tg_submission() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text; chn text;
begin
  if new.status = 'Enviado' and (tg_op = 'INSERT' or old.status is distinct from 'Enviado') then
    select name into cn from creators where id = new.creator_id;
    select name into chn from challenges where id = new.challenge_id;
    perform public.notify_staff('desafios', 'Comprovante enviado: ' || coalesce(cn, 'creator') || ' em ' || coalesce(chn, 'desafio'), '/desafios');
  end if;
  return new;
end $$;
drop trigger if exists submission_notify on public.challenge_submissions;
create trigger submission_notify after insert or update on public.challenge_submissions for each row execute function public.tg_submission();

create or replace function public.tg_content() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text;
begin
  if new.status = 'Enviado' and (tg_op = 'INSERT' or old.status is distinct from 'Enviado') then
    select name into cn from creators where id = new.creator_id;
    perform public.notify_staff('conteudos', 'Conteúdo enviado: ' || coalesce(cn, 'creator') || ' (' || new.platform || ' · ' || new.type || ')', '/conteudos');
  end if;
  return new;
end $$;
drop trigger if exists content_notify on public.contents;
create trigger content_notify after insert or update on public.contents for each row execute function public.tg_content();

create or replace function public.tg_pk_order() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text; kn text;
begin
  select name into cn from creators where id = new.creator_id;
  select name into kn from press_kits where id = new.pk_id;
  perform public.notify_staff('presskits', '🎁 Pedido de press kit: ' || coalesce(cn, 'creator') || ' · ' || coalesce(kn, ''), '/presskits');
  return new;
end $$;
drop trigger if exists pk_order_notify on public.pk_orders;
create trigger pk_order_notify after insert on public.pk_orders for each row execute function public.tg_pk_order();

create or replace function public.tg_form_response() returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select title into t from forms where id = new.form_id;
  perform public.notify_staff('formularios', 'Nova resposta no formulário ' || coalesce(t, ''), '/formularios');
  return new;
end $$;
drop trigger if exists form_response_notify on public.form_responses;
create trigger form_response_notify after insert on public.form_responses for each row execute function public.tg_form_response();

create or replace function public.tg_lead() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'Formulário Para Marcas' then
    perform public.notify_staff('crm', '🔔 Novo lead de marca: ' || coalesce(new.brand_name, new.company) || '. Interesse: ' || coalesce(new.interests[1], '—') || '. Responsável: ' || new.contact || coalesce(' · WhatsApp ' || new.phone, ''), '/leads');
  end if;
  return new;
end $$;
drop trigger if exists lead_notify on public.leads;
create trigger lead_notify after insert on public.leads for each row execute function public.tg_lead();

create or replace function public.tg_method_purchase() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text;
begin
  if new.status = 'Aguardando pagamento' then
    select name into cn from creators where id = new.creator_id;
    perform public.notify_staff('metodo_adm', 'Checkout do Método iniciado por ' || coalesce(cn, 'creator') || ' (aguardando confirmação de pagamento)', '/metodo');
  end if;
  return new;
end $$;
drop trigger if exists method_purchase_notify on public.method_purchases;
create trigger method_purchase_notify after insert on public.method_purchases for each row execute function public.tg_method_purchase();

create or replace function public.tg_shipment_brand() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text;
begin
  if public.my_brand() is not null and (new.status is distinct from old.status or new.tracking is distinct from old.tracking) then
    select name into cn from creators where id = new.creator_id;
    perform public.notify_staff('amostras', 'Envio atualizado pela marca: ' || new.product || ' para ' || coalesce(cn, 'creator') || ' · ' || new.status, '/envios');
  end if;
  return new;
end $$;
drop trigger if exists shipment_brand_notify on public.shipments;
create trigger shipment_brand_notify after update on public.shipments for each row execute function public.tg_shipment_brand();

-- A marca só mexe nos campos de logística do envio
create or replace function public.guard_shipment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' or public.can_mod('amostras') or public.can_mod('presskits') then return new; end if;
  if new.creator_id is distinct from old.creator_id or new.brand_id is distinct from old.brand_id or new.campaign_id is distinct from old.campaign_id
     or new.pk_order_id is distinct from old.pk_order_id or new.approved_by is distinct from old.approved_by or new.reason is distinct from old.reason then
    raise exception 'Sem permissão para alterar este envio';
  end if;
  return new;
end $$;
drop trigger if exists shipments_guard on public.shipments;
create trigger shipments_guard before update on public.shipments for each row execute function public.guard_shipment();

-- =====================================================================
-- Regras de acesso (RLS) — recriadas toda vez que o arquivo roda
-- =====================================================================
do $$ declare t text; begin
  foreach t in array array['challenges','challenge_participants','challenge_submissions','rewards','points_log','report_entries','reports','leads','lead_notes','tasks','contents','press_kits','pk_orders','shipments','forms','form_responses','fin_entries','reminder_log','sales','settings','method_modules','method_lessons','method_purchases','method_progress'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and policyname like 'cy_%' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- campanhas: a marca propõe e ajusta a própria campanha enquanto está em aprovação
create policy cy_camp_brand_ins on public.campaigns for insert with check (brand_id = public.my_brand() and status = 'Em aprovação');
create policy cy_camp_brand_upd on public.campaigns for update
  using (brand_id = public.my_brand() and status in ('Em aprovação','Ajuste solicitado'))
  with check (brand_id = public.my_brand() and status = 'Em aprovação');

-- desafios
create policy cy_ch_sel on public.challenges for select using (public.can_mod('desafios') or (brand_id is not null and brand_id = public.my_brand()) or public.challenge_visible_to_me(id));
create policy cy_ch_ins on public.challenges for insert with check (public.can_mod('desafios') or (brand_id = public.my_brand() and status = 'Em aprovação' and result is null));
create policy cy_ch_upd on public.challenges for update
  using (public.can_mod('desafios') or (brand_id = public.my_brand() and status in ('Em aprovação','Ajuste solicitado')))
  with check (public.can_mod('desafios') or (brand_id = public.my_brand() and status = 'Em aprovação' and result is null));
create policy cy_ch_del on public.challenges for delete using (public.is_ceo());

create policy cy_chp_sel on public.challenge_participants for select using (public.can_mod('desafios') or creator_id = public.my_creator() or public.challenge_of_my_brand(challenge_id));
create policy cy_chp_ins on public.challenge_participants for insert with check ((creator_id = public.my_creator() and progress = 0 and public.challenge_open(challenge_id)) or public.can_mod('desafios'));
create policy cy_chp_upd on public.challenge_participants for update using (public.can_mod('desafios'));
create policy cy_chp_del on public.challenge_participants for delete using (public.can_mod('desafios'));

create policy cy_chs_sel on public.challenge_submissions for select using (public.can_mod('desafios') or creator_id = public.my_creator());
create policy cy_chs_ins on public.challenge_submissions for insert with check (creator_id = public.my_creator() and status = 'Enviado' and note is null and public.challenge_open(challenge_id));
create policy cy_chs_upd_cr on public.challenge_submissions for update
  using (creator_id = public.my_creator() and status in ('Ajuste necessário','Reprovado'))
  with check (creator_id = public.my_creator() and status = 'Enviado' and public.challenge_open(challenge_id));
create policy cy_chs_upd_st on public.challenge_submissions for update using (public.can_mod('desafios'));

create policy cy_rw_sel on public.rewards for select using (public.can_mod('desafios') or public.can_mod('fin') or creator_id = public.my_creator());
create policy cy_rw_ins on public.rewards for insert with check (public.can_mod('desafios') or public.can_mod('fin'));
create policy cy_rw_upd on public.rewards for update using (public.can_mod('desafios') or public.can_mod('fin'));

create policy cy_pts_sel on public.points_log for select using (public.can_mod('creators') or public.can_mod('desafios') or public.can_mod('gamificacao') or creator_id = public.my_creator());
create policy cy_pts_ins on public.points_log for insert with check (public.can_mod('desafios') or public.can_mod('creators'));

-- relatório vivo
create policy cy_re_sel on public.report_entries for select using (public.can_mod('relatorios') or public.can_mod('campanhas') or public.can_mod('desafios') or brand_id = public.my_brand());
create policy cy_re_ins on public.report_entries for insert with check (public.can_mod('relatorios') or public.can_mod('campanhas') or public.can_mod('desafios'));
create policy cy_re_del on public.report_entries for delete using (public.is_ceo());
create policy cy_rep_sel on public.reports for select using (public.can_mod('relatorios') or brand_id = public.my_brand());
create policy cy_rep_ins on public.reports for insert with check (public.can_mod('relatorios'));
create policy cy_rep_del on public.reports for delete using (public.is_ceo());

-- leads: formulário público cria; só o comercial lê e trabalha
create policy cy_lead_pub on public.leads for insert with check (
  (source = 'Formulário Para Marcas' and stage = 'Novo Lead' and owner_id is null and brand_id is null and value is null and converted_at is null)
  or public.can_mod('crm'));
create policy cy_lead_sel on public.leads for select using (public.can_mod('crm'));
create policy cy_lead_upd on public.leads for update using (public.can_mod('crm'));
create policy cy_lead_del on public.leads for delete using (public.is_ceo());
create policy cy_ln_all on public.lead_notes for all using (public.can_mod('crm')) with check (public.can_mod('crm'));

-- tarefas
create policy cy_task_all on public.tasks for all using (public.can_mod('demandas')) with check (public.can_mod('demandas'));

-- conteúdos
create policy cy_ct_sel on public.contents for select using (public.can_mod('conteudos') or creator_id = public.my_creator() or (campaign_id is not null and public.campaign_of_my_brand(campaign_id)));
create policy cy_ct_ins on public.contents for insert with check (public.can_mod('conteudos') or (creator_id = public.my_creator() and status = 'Enviado' and views = 0 and interactions = 0 and campaign_id is not null and public.creator_approved_in(campaign_id)));
create policy cy_ct_upd_cr on public.contents for update
  using (creator_id = public.my_creator() and status = 'Ajuste solicitado')
  with check (creator_id = public.my_creator() and status = 'Enviado');
create policy cy_ct_upd_st on public.contents for update using (public.can_mod('conteudos'));
create policy cy_ct_del on public.contents for delete using (public.is_ceo());

-- press kits
create policy cy_pk_sel on public.press_kits for select using (public.can_mod('presskits') or public.can_mod('amostras') or (brand_id is not null and brand_id = public.my_brand()) or (public.my_creator() is not null and status = 'Ativo'));
create policy cy_pk_ins on public.press_kits for insert with check (public.can_mod('presskits'));
create policy cy_pk_upd on public.press_kits for update using (public.can_mod('presskits'));
create policy cy_pk_del on public.press_kits for delete using (public.is_ceo());

create policy cy_pko_sel on public.pk_orders for select using (public.can_mod('presskits') or public.can_mod('amostras') or creator_id = public.my_creator() or public.pk_of_my_brand(pk_id));
create policy cy_pko_ins on public.pk_orders for insert with check (public.can_mod('presskits') or (creator_id = public.my_creator() and status in ('Aguardando pagamento','Preparando') and payment in ('Aguardando','Gratuito') and tracking is null));
create policy cy_pko_upd on public.pk_orders for update using (public.can_mod('presskits'));

-- envios
create policy cy_sh_sel on public.shipments for select using (public.can_mod('amostras') or public.can_mod('presskits') or (brand_id is not null and brand_id = public.my_brand()) or creator_id = public.my_creator());
create policy cy_sh_ins on public.shipments for insert with check (public.can_mod('amostras') or public.can_mod('presskits') or public.can_mod('candidaturas'));
create policy cy_sh_upd on public.shipments for update using (public.can_mod('amostras') or public.can_mod('presskits') or (brand_id is not null and brand_id = public.my_brand())) with check (public.can_mod('amostras') or public.can_mod('presskits') or brand_id = public.my_brand());

-- formulários: publicados podem ser abertos e respondidos por qualquer pessoa
create policy cy_form_sel on public.forms for select using (public.can_mod('formularios') or status = 'Publicado');
create policy cy_form_ins on public.forms for insert with check (public.can_mod('formularios'));
create policy cy_form_upd on public.forms for update using (public.can_mod('formularios'));
create policy cy_form_del on public.forms for delete using (public.is_ceo());
create policy cy_fr_sel on public.form_responses for select using (public.can_mod('formularios'));
create policy cy_fr_ins on public.form_responses for insert with check (public.form_published(form_id) and (creator_id is null or creator_id = public.my_creator()));
create policy cy_fr_del on public.form_responses for delete using (public.is_ceo());

-- financeiro: só quem tem o módulo; a marca vê as próprias cobranças
create policy cy_fin_sel on public.fin_entries for select using (public.can_mod('fin') or (kind = 'receber' and brand_id is not null and brand_id = public.my_brand()));
create policy cy_fin_ins on public.fin_entries for insert with check (public.can_mod('fin'));
create policy cy_fin_upd on public.fin_entries for update using (public.can_mod('fin'));
create policy cy_fin_del on public.fin_entries for delete using (public.is_ceo());
create policy cy_rem_sel on public.reminder_log for select using (public.can_mod('fin') or (brand_id is not null and brand_id = public.my_brand()));
create policy cy_rem_ins on public.reminder_log for insert with check (public.can_mod('fin'));
create policy cy_sale_sel on public.sales for select using (public.can_mod('fin') or creator_id = public.my_creator());
create policy cy_sale_ins on public.sales for insert with check (public.can_mod('fin'));
create policy cy_sale_upd on public.sales for update using (public.can_mod('fin'));
create policy cy_sale_del on public.sales for delete using (public.is_ceo());

-- configurações: o número do WhatsApp e o checkout do Método são públicos; o resto é da equipe
create policy cy_set_sel on public.settings for select using ((key in ('whatsapp','metodo','lead_qs','push_public')) or (public.is_staff() and key not in ('b4you','push')) or (public.is_ceo() and key <> 'push'));
create policy cy_set_ins on public.settings for insert with check (public.is_ceo());
create policy cy_set_upd on public.settings for update using (public.is_ceo() or (key = 'rem' and public.can_mod('fin')));

-- Método: regras de acesso ficam no 05_club_criadora.sql (por produto)

-- Índices úteis
create index if not exists ix_ch_brand on public.challenges(brand_id);
create index if not exists ix_ct_campaign on public.contents(campaign_id);
create index if not exists ix_sh_brand on public.shipments(brand_id);
create index if not exists ix_fin_brand on public.fin_entries(brand_id);
create index if not exists ix_re_brand on public.report_entries(brand_id);
