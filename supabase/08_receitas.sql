-- =====================================================================
-- CONECTA · Receitas por origem e vendas da B4YOU no financeiro
-- Rode depois do 07. Pode rodar de novo sem problema.
-- =====================================================================

-- Produtos das marcas vendidos pela B4YOU (para calcular a comissão da Conecta)
create table if not exists public.brand_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  b4you_product text,
  price numeric(12,2),
  creator_pct numeric(5,2) not null default 0,
  conecta_pct numeric(5,2) not null default 0,
  status text not null default 'Ativo' check (status in ('Ativo','Pausado')),
  created_at timestamptz not null default now()
);
alter table public.brand_products enable row level security;
drop policy if exists bp_sel on public.brand_products;
drop policy if exists bp_all on public.brand_products;
create policy bp_sel on public.brand_products for select using (public.can_mod('fin') or brand_id = public.my_brand());
create policy bp_all on public.brand_products for all using (public.can_mod('fin')) with check (public.can_mod('fin'));

-- Cada venda diz de onde veio
alter table public.sales add column if not exists kind text not null default 'Outro';
alter table public.sales drop constraint if exists sales_kind_check;
alter table public.sales add constraint sales_kind_check check (kind in ('Club Criadora','Comissão de marca','Press kit','Outro'));
alter table public.sales add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.sales add column if not exists brand_product_id uuid references public.brand_products(id) on delete set null;
alter table public.sales add column if not exists buyer_email text;
alter table public.sales add column if not exists order_code text;
alter table public.sales add column if not exists b4_event_id uuid references public.b4_events(id) on delete set null;

-- Vendas antigas do Club Criadora registradas pelo webhook
update public.sales s set kind = 'Club Criadora', product_id = p.id from public.products p where s.kind = 'Outro' and s.source = 'B4YOU' and s.brand_id is null and s.product = p.title;
