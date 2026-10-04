-- =====================================================================
-- CONECTA · Club Criadora: vários produtos com área de membros
-- (Método Criadora Expert, Presets, Criadora Organizada e os que vierem).
-- Rode DEPOIS do 04_calendario.sql. Pode rodar de novo sem problema.
-- =====================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  tagline text, description text,
  cover_path text, color text,
  checkout_url text, b4you_product text, price numeric(12,2),
  status text not null default 'Rascunho' check (status in ('Rascunho','Publicado','Oculto')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Produtos iniciais (o Método herda o checkout já configurado)
insert into public.products (title, slug, tagline, status, position, color, checkout_url, b4you_product, price)
select 'Método Criadora Expert', 'metodo-criadora-expert', 'O passo a passo para crescer, fechar com marcas e vender com o seu conteúdo.', 'Publicado', 0, '#E6007E',
  nullif((select value->>'checkout' from public.settings where key = 'metodo'), ''),
  nullif((select value->>'metodo_product' from public.settings where key = 'b4you'), ''),
  nullif((select value->>'price' from public.settings where key = 'metodo'), '')::numeric
on conflict (slug) do nothing;
insert into public.products (title, slug, tagline, status, position, color) values
  ('Presets', 'presets', 'Os presets da Conecta para deixar suas fotos com cara de marca.', 'Publicado', 1, '#111111'),
  ('Criadora Organizada', 'criadora-organizada', 'Planejamento, rotina e organização para a creator que quer constância.', 'Publicado', 2, '#7A1F5C')
on conflict (slug) do nothing;

-- Módulos e compras passam a pertencer a um produto
alter table public.method_modules add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.method_purchases add column if not exists product_id uuid references public.products(id) on delete cascade;
update public.method_modules set product_id = (select id from public.products where slug = 'metodo-criadora-expert') where product_id is null;
update public.method_purchases set product_id = (select id from public.products where slug = 'metodo-criadora-expert') where product_id is null;
alter table public.b4_events add column if not exists product_id uuid references public.products(id) on delete set null;

-- Ajudantes
create or replace function public.has_product(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from method_purchases x where x.creator_id = public.my_creator() and x.product_id = p and x.status = 'Pago');
$$;
create or replace function public.product_published(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from products x where x.id = p and x.status = 'Publicado');
$$;
create or replace function public.module_product(m uuid) returns uuid language sql stable security definer set search_path = public as $$
  select product_id from method_modules where id = m;
$$;
create or replace function public.lesson_product(l uuid) returns uuid language sql stable security definer set search_path = public as $$
  select mm.product_id from method_lessons ml join method_modules mm on mm.id = ml.module_id where ml.id = l;
$$;

-- Aviso de checkout iniciado (com o nome do produto)
create or replace function public.tg_method_purchase() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text; pn text;
begin
  if new.status = 'Aguardando pagamento' then
    select name into cn from creators where id = new.creator_id;
    select title into pn from products where id = new.product_id;
    perform public.notify_staff('metodo_adm', 'Checkout de ' || coalesce(pn, 'produto') || ' iniciado por ' || coalesce(cn, 'creator') || ' (aguardando confirmação de pagamento)', '/club/admin');
  end if;
  return new;
end $$;

-- Regras de acesso (por produto)
alter table public.products enable row level security;
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and (policyname like 'cp_%' or policyname in ('cy_mm_sel','cy_mm_all','cy_ml_sel','cy_ml_all','cy_mp_sel','cy_mp_ins','cy_mp_upd','cy_mpr_sel','cy_mpr_ins','cy_mpr_del')) loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy cp_prod_sel on public.products for select using (status = 'Publicado' or public.can_mod('metodo_adm'));
create policy cp_prod_all on public.products for all using (public.can_mod('metodo_adm')) with check (public.can_mod('metodo_adm'));

-- módulos: quem não comprou vê só os títulos (vitrine com cadeado); aulas só quem comprou aquele produto
create policy cp_mm_sel on public.method_modules for select using (public.can_mod('metodo_adm') or (public.my_creator() is not null and status = 'Publicado' and public.product_published(product_id)));
create policy cp_mm_all on public.method_modules for all using (public.can_mod('metodo_adm')) with check (public.can_mod('metodo_adm'));
create policy cp_ml_sel on public.method_lessons for select using (public.can_mod('metodo_adm') or (status = 'Publicada' and public.module_published(module_id) and public.has_product(public.module_product(module_id))));
create policy cp_ml_all on public.method_lessons for all using (public.can_mod('metodo_adm')) with check (public.can_mod('metodo_adm'));

create policy cp_mp_sel on public.method_purchases for select using (public.can_mod('metodo_adm') or public.can_mod('fin') or creator_id = public.my_creator());
create policy cp_mp_ins on public.method_purchases for insert with check (public.can_mod('metodo_adm') or (creator_id = public.my_creator() and status = 'Aguardando pagamento' and paid_at is null and confirmed_by is null and product_id is not null));
create policy cp_mp_upd on public.method_purchases for update using (public.can_mod('metodo_adm') or public.can_mod('fin'));

create policy cp_mpr_sel on public.method_progress for select using (public.can_mod('metodo_adm') or creator_id = public.my_creator());
create policy cp_mpr_ins on public.method_progress for insert with check (creator_id = public.my_creator() and public.has_product(public.lesson_product(lesson_id)));
create policy cp_mpr_del on public.method_progress for delete using (creator_id = public.my_creator());
