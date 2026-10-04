-- =====================================================================
-- CONECTA · Notificações no celular (push). Rode depois do 06.
-- Cada aparelho que ativar as notificações fica registrado aqui;
-- toda notificação nova da plataforma também vai para a tela do celular.
-- =====================================================================
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  device text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Chaves do push: a pública qualquer pessoa logada lê; a privada só o servidor
drop policy if exists cy_set_sel on public.settings;
create policy cy_set_sel on public.settings for select using ((key in ('whatsapp','metodo','lead_qs','push_public')) or (public.is_staff() and key not in ('b4you','push')) or (public.is_ceo() and key <> 'push'));

-- Toda notificação nova chama o servidor da plataforma, que manda para o celular
create or replace function public.tg_push() returns trigger language plpgsql security definer set search_path = public as $$
declare cfg jsonb;
begin
  select value into cfg from settings where key = 'push';
  if cfg is not null and coalesce(cfg->>'url', '') <> '' then
    perform net.http_post(url := cfg->>'url', body := jsonb_build_object('id', new.id), headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg->>'secret'));
  end if;
  return new;
exception when others then return new; -- push nunca impede a notificação de ser criada
end $$;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.tg_push();
