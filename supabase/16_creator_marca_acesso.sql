-- =====================================================================
-- CONECTA · Creator da marca: vê as oportunidades das marcas dela
-- A creator "só da marca" passa a ver as campanhas abertas e os desafios
-- das marcas em que ela está (as outras marcas continuam escondidas).
-- Rode depois do 15. Pode rodar de novo sem problema.
-- =====================================================================
drop policy if exists cx_camp_sel on public.campaigns;
create policy cx_camp_sel on public.campaigns for select using (public.can_mod('campanhas') or brand_id = public.my_brand()
  or (public.my_creator() is not null and (
        (status in ('Inscrições abertas','Ativa') and (not public.my_creator_limited() or brand_id in (select public.my_creator_brands())))
        or public.creator_in_campaign(id))));
