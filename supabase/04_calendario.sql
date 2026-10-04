-- =====================================================================
-- CONECTA · Calendário da equipe (compromissos). Rode depois do 03.
-- As tarefas, campanhas, desafios, follow-ups e vencimentos já aparecem
-- no calendário automaticamente; esta tabela guarda reuniões e compromissos.
-- =====================================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null, notes text, location text,
  day date not null, start_time time, end_time time,
  owner_id uuid references public.profiles(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'calendar_events' loop
    execute format('drop policy %I on public.calendar_events', r.policyname);
  end loop;
end $$;
create policy cal_all on public.calendar_events for all using (public.is_staff()) with check (public.is_staff());
