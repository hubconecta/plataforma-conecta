-- =====================================================================
-- CONECTA · Avisos (comunicados) para creators, marcas e equipe
-- A equipe escreve o aviso, escolhe quem recebe (base Conecta, todas as
-- creators, creators de uma marca, aprovadas numa campanha, marcas, equipe)
-- e cada pessoa recebe a notificação. Pode ficar fixado no início.
-- Rode depois do 21. Pode rodar de novo sem problema.
-- =====================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  button_label text,
  button_url text,
  audience text not null,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  pinned_until date,
  send_email boolean not null default false,
  sent_count int not null default 0,
  emailed_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.announcement_recipients (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  primary key (announcement_id, profile_id)
);
create index if not exists ix_ann_rec_profile on public.announcement_recipients (profile_id);

create or replace function public.ann_for_me(a uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from announcement_recipients r where r.announcement_id = a and r.profile_id = auth.uid());
$$;

alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
drop policy if exists ann_sel on public.announcements; drop policy if exists ann_all on public.announcements;
drop policy if exists anr_sel on public.announcement_recipients; drop policy if exists anr_upd on public.announcement_recipients; drop policy if exists anr_all on public.announcement_recipients;
create policy ann_sel on public.announcements for select using (public.is_team() or public.ann_for_me(id));
create policy ann_all on public.announcements for all using (public.is_team()) with check (public.is_team());
create policy anr_sel on public.announcement_recipients for select using (profile_id = auth.uid() or public.is_team());
create policy anr_upd on public.announcement_recipients for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy anr_all on public.announcement_recipients for all using (public.is_team()) with check (public.is_team());
