-- =====================================================================
-- CONECTA · Etiquetas (estilo Trello)
-- A CEO e a equipe criam etiquetas com nome e cor e colocam em
-- marcas, creators, formulários, tarefas e compromissos do calendário.
-- As etiquetas são internas: marcas e creators nunca veem.
-- Rode depois do 11. Pode rodar de novo sem problema.
-- =====================================================================

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#E6007E',
  scope text not null default 'Todas' check (scope in ('Todas','Marcas','Creators','Formulários','Tarefas','Calendário')),
  position int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.label_links (
  label_id uuid not null references public.labels(id) on delete cascade,
  entity text not null check (entity in ('marca','creator','form','task','event')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (label_id, entity, entity_id)
);
create index if not exists ix_label_links_entity on public.label_links (entity, entity_id);

-- Módulo que dá direito a etiquetar cada tipo de item
create or replace function public.label_mod(e text) returns text language sql immutable as $$
  select case e when 'marca' then 'marcas' when 'creator' then 'creators' when 'form' then 'formularios' when 'task' then 'demandas' when 'event' then 'calendario' end;
$$;

-- Equipe (CEO e colaboradoras) — o financeiro e os portais não usam etiquetas
create or replace function public.is_team() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and status = 'ativo' and role in ('ceo','equipe'));
$$;

alter table public.labels enable row level security;
alter table public.label_links enable row level security;
drop policy if exists lb_sel on public.labels; drop policy if exists lb_all on public.labels;
drop policy if exists ll_sel on public.label_links; drop policy if exists ll_ins on public.label_links; drop policy if exists ll_del on public.label_links;
create policy lb_sel on public.labels for select using (public.is_team());
create policy lb_all on public.labels for all using (public.is_team()) with check (public.is_team());
create policy ll_sel on public.label_links for select using (public.is_team());
create policy ll_ins on public.label_links for insert with check (public.is_team() and (public.is_ceo() or public.can_mod(public.label_mod(entity)) or entity = 'event'));
create policy ll_del on public.label_links for delete using (public.is_team() and (public.is_ceo() or public.can_mod(public.label_mod(entity)) or entity = 'event'));

-- Quando o item é apagado, as etiquetas dele somem junto
create or replace function public.tg_label_cleanup() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from label_links where entity = tg_argv[0] and entity_id = old.id;
  return old;
end $$;
drop trigger if exists label_cleanup on public.brands;
create trigger label_cleanup after delete on public.brands for each row execute function public.tg_label_cleanup('marca');
drop trigger if exists label_cleanup on public.creators;
create trigger label_cleanup after delete on public.creators for each row execute function public.tg_label_cleanup('creator');
drop trigger if exists label_cleanup on public.forms;
create trigger label_cleanup after delete on public.forms for each row execute function public.tg_label_cleanup('form');
drop trigger if exists label_cleanup on public.tasks;
create trigger label_cleanup after delete on public.tasks for each row execute function public.tg_label_cleanup('task');
drop trigger if exists label_cleanup on public.calendar_events;
create trigger label_cleanup after delete on public.calendar_events for each row execute function public.tg_label_cleanup('event');

-- Algumas etiquetas para começar (só se ainda não existir nenhuma)
insert into public.labels (name, color, scope, position)
select * from (values
  ('Urgente', '#EB5A46', 'Todas', 1),
  ('Prioridade', '#FF9F1A', 'Todas', 2),
  ('Aguardando retorno', '#F2D600', 'Todas', 3),
  ('Reunião', '#0079BF', 'Calendário', 4),
  ('Gravação', '#C377E0', 'Calendário', 5),
  ('VIP', '#E6007E', 'Creators', 6),
  ('Afiliada top', '#61BD4F', 'Creators', 7),
  ('Cliente ativa', '#61BD4F', 'Marcas', 8),
  ('Renovação', '#00C2E0', 'Marcas', 9)
) v where not exists (select 1 from public.labels);
