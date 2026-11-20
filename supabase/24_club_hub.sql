-- =====================================================================
-- CONECTA · Produtos do Club Criadora exclusivos do Conecta Hub
-- Um produto marcado como "Exclusivo Conecta Hub" fica liberado para quem
-- assina o Hub (sem compra avulsa). Para as Free aparece com cadeado.
-- Rode depois do 23. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.products add column if not exists hub_included boolean not null default false;
update public.products set hub_included = true where slug = 'conecta-academy';

-- Acesso às aulas (vale no banco, não só na tela)
create or replace function public.has_product(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from method_purchases x where x.creator_id = public.my_creator() and x.product_id = p and x.status = 'Pago')
    or (public.my_hub() and exists(select 1 from products y where y.id = p and (y.hub_included or y.slug = 'conecta-academy')));
$$;
