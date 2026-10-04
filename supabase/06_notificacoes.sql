-- =====================================================================
-- CONECTA · Notificações em tempo real e avisos que faltavam
-- Rode DEPOIS do 05_club_criadora.sql. Pode rodar de novo sem problema.
-- =====================================================================

-- Sino atualiza na hora (sem precisar recarregar a página)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
exception when undefined_object then null; -- ambiente sem tempo real: segue sem
end $$;

-- Nova inscrição de creator em campanha → equipe com "Inscrições em campanhas"
create or replace function public.tg_campaign_app() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text; cp text;
begin
  select name into cn from creators where id = new.creator_id;
  select name into cp from campaigns where id = new.campaign_id;
  perform public.notify_staff('candidaturas', '📩 Nova inscrição: ' || coalesce(cn, 'creator') || ' quer participar de ' || coalesce(cp, 'uma campanha'), '/inscricoes');
  return new;
end $$;
drop trigger if exists campaign_app_notify on public.campaign_applications;
create trigger campaign_app_notify after insert on public.campaign_applications for each row execute function public.tg_campaign_app();

-- Creator entrou em um desafio → equipe de desafios
create or replace function public.tg_challenge_join() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text; chn text;
begin
  if public.my_creator() is not null then
    select name into cn from creators where id = new.creator_id;
    select name into chn from challenges where id = new.challenge_id;
    perform public.notify_staff('desafios', '🔥 ' || coalesce(cn, 'Uma creator') || ' entrou no desafio ' || coalesce(chn, ''), '/desafios/' || new.challenge_id);
  end if;
  return new;
end $$;
drop trigger if exists challenge_join_notify on public.challenge_participants;
create trigger challenge_join_notify after insert on public.challenge_participants for each row execute function public.tg_challenge_join();

-- Creator atualizou o endereço → logística
create or replace function public.tg_address() returns trigger language plpgsql security definer set search_path = public as $$
declare cn text;
begin
  if public.my_creator() is not null then
    select name into cn from creators where id = new.creator_id;
    perform public.notify_staff('amostras', '🏠 ' || coalesce(cn, 'Uma creator') || ' atualizou o endereço de entrega', '/envios');
  end if;
  return new;
end $$;
drop trigger if exists address_notify on public.creator_addresses;
create trigger address_notify after insert or update on public.creator_addresses for each row execute function public.tg_address();
