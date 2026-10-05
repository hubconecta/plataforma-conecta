-- =====================================================================
-- CONECTA · Desafio só para a base da marca
-- Público "Creators da base da marca": só quem está na base de creators
-- da marca do desafio vê (e quem já está participando).
-- Rode depois do 16. Pode rodar de novo sem problema.
-- =====================================================================
create or replace function public.challenge_visible_to_me(ch uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from challenges x where x.id = ch and x.status in ('Ativo','Encerrado') and public.my_creator() is not null
    and (
      exists(select 1 from challenge_participants p where p.challenge_id = x.id and p.creator_id = public.my_creator())
      or (
        -- creator só da marca: só desafios das marcas dela
        (not public.my_creator_limited() or x.brand_id in (select public.my_creator_brands()))
        -- público "Creators da base da marca": só a base da marca
        and (x.audience <> 'Creators da base da marca' or x.brand_id in (select public.my_creator_brands()))
        and (x.audience not like 'Participantes%' or x.campaign_id is null or public.creator_approved_in(x.campaign_id)))));
$$;
