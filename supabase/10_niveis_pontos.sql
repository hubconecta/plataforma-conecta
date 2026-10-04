-- =====================================================================
-- CONECTA · Níveis e pontuação das creators
-- Rode depois do 09. Pode rodar de novo sem problema.
-- A CEO e a equipe com "Níveis e pontos" definem os níveis e quanto vale cada ação.
-- =====================================================================

create table if not exists public.levels (
  id uuid primary key default gen_random_uuid(),
  position int not null,
  name text not null,
  min_points int not null default 0,
  color text not null default '#E6007E',
  perks text,
  created_at timestamptz not null default now()
);
insert into public.levels (position, name, min_points, color, perks)
select * from (values
  (1, 'Creator Iniciante', 0, '#9CA3AF', 'Primeiros passos na Conecta: acesso às oportunidades e aos desafios.'),
  (2, 'Creator em Ascensão', 300, '#FF5FA2', 'Prioridade para campanhas de permuta e press kits.'),
  (3, 'Creator Destaque', 1000, '#E6007E', 'Indicação para campanhas pagas e destaque para as marcas.'),
  (4, 'Creator Elite Conecta', 2500, '#111111', 'Primeiro convite para as melhores campanhas e benefícios exclusivos.')
) v where not exists (select 1 from public.levels);

create table if not exists public.point_rules (
  key text primary key,
  label text not null,
  description text,
  points int not null default 0,
  auto boolean not null default false,
  active boolean not null default true,
  position int not null default 0
);
insert into public.point_rules (key, label, description, points, auto, position) values
  ('campanha_aprovada', 'Aprovada em uma campanha', 'Quando a inscrição dela é aprovada.', 20, true, 1),
  ('entrega_no_prazo', 'Conteúdo entregue no prazo', 'Conteúdo aprovado e enviado até a data final da campanha.', 30, true, 2),
  ('conteudo_aprovado', 'Conteúdo aprovado', 'Cada conteúdo aprovado pela Conecta.', 15, true, 3),
  ('conteudo_publicado', 'Conteúdo publicado', 'Cada conteúdo marcado como publicado.', 10, true, 4),
  ('venda', 'Venda registrada', 'Cada venda com link/cupom dela.', 10, true, 5),
  ('desafio_ganhadora', 'Ganhadora de desafio', 'Ficar entre as ganhadoras de um desafio (além dos pontos do próprio desafio).', 100, true, 6),
  ('perfil_completo', 'Perfil e endereço completos', 'Uma vez, ao cadastrar o endereço.', 10, true, 7),
  ('reels_bem_feito', 'Reels bem feito', 'A equipe dá quando o conteúdo se destaca.', 25, false, 8),
  ('conteudo_de_vendas', 'Conteúdo que vendeu muito', 'A equipe dá quando o conteúdo gerou vendas acima da média.', 40, false, 9),
  ('postura_profissional', 'Postura profissional', 'Comunicação, prazos e parceria exemplares.', 20, false, 10)
on conflict (key) do nothing;

alter table public.points_log add column if not exists rule_key text;
alter table public.points_log add column if not exists ref_id uuid;
alter table public.points_log add column if not exists given_by text;
create unique index if not exists ux_points_auto on public.points_log (creator_id, rule_key, ref_id) where rule_key is not null and ref_id is not null;

-- Pontos atualizam o total da creator (sem a creator conseguir mexer no próprio total)
create or replace function public.guard_creator() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' or public.can_mod('creators') or current_setting('cx.points', true) = '1' then return new; end if;
  if new.xp is distinct from old.xp or new.status is distinct from old.status or new.tags is distinct from old.tags then
    raise exception 'Sem permissão para alterar estes dados';
  end if;
  return new;
end $$;

create or replace function public.level_for(p int) returns text language sql stable security definer set search_path = public as $$
  select name from levels where min_points <= coalesce(p, 0) order by min_points desc limit 1;
$$;

-- Lança pontos (uso interno dos gatilhos e das funções abaixo)
create or replace function public._award(cr uuid, rk text, pts int, reason text, ref uuid, who text) returns int language plpgsql security definer set search_path = public as $$
declare before int; after int; lv_before text; lv_after text; n int;
begin
  if cr is null or coalesce(pts, 0) = 0 then return 0; end if;
  insert into points_log (creator_id, points, reason, rule_key, ref_id, given_by) values (cr, pts, reason, rk, ref, who)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 0; end if;
  select coalesce(xp, 0) into before from creators where id = cr;
  after := before + pts;
  perform set_config('cx.points', '1', true);
  update creators set xp = after where id = cr;
  perform set_config('cx.points', '0', true);
  lv_before := public.level_for(before); lv_after := public.level_for(after);
  insert into notifications (user_id, text, link)
  select p.id, case when pts > 0 then '⭐ +' || pts || ' pontos: ' || reason else '➖ ' || pts || ' pontos: ' || reason end, '/clube/jornada'
  from profiles p where p.creator_id = cr and p.role = 'creator' and p.status = 'ativo';
  if lv_after is distinct from lv_before and after > before then
    insert into notifications (user_id, text, link)
    select p.id, '🎉 Parabéns! Você subiu para o nível ' || lv_after || '!', '/clube/jornada'
    from profiles p where p.creator_id = cr and p.role = 'creator' and p.status = 'ativo';
    perform public.notify_staff('gamificacao', '🏅 ' || coalesce((select name from creators where id = cr), 'Uma creator') || ' subiu para o nível ' || lv_after, '/gamificacao?tab=ranking');
  end if;
  return pts;
end $$;
revoke execute on function public._award(uuid, text, int, text, uuid, text) from public, anon, authenticated;

create or replace function public._award_rule(cr uuid, rk text, ref uuid, extra text default null) returns int language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from point_rules where key = rk and active;
  if r is null then return 0; end if;
  return public._award(cr, rk, r.points, r.label || coalesce(' · ' || extra, ''), ref, 'Automático');
end $$;
revoke execute on function public._award_rule(uuid, text, uuid, text) from public, anon, authenticated;

-- Pontos manuais (equipe): por regra ou valor livre, com motivo
create or replace function public.award_points(cr uuid, rk text, pts int, reason text) returns int language plpgsql security definer set search_path = public as $$
declare r record; who text; v int; lbl text;
begin
  if not (public.can_mod('gamificacao') or public.can_mod('creators')) then raise exception 'Sem permissão para dar pontos'; end if;
  select coalesce(name, email) into who from profiles where id = auth.uid();
  if rk is not null and rk <> '' then select * into r from point_rules where key = rk; end if;
  v := coalesce(pts, r.points, 0);
  lbl := coalesce(nullif(reason, ''), r.label, 'Pontos da Conecta');
  return public._award(cr, nullif(rk, ''), v, lbl, gen_random_uuid(), who);
end $$;
grant execute on function public.award_points(uuid, text, int, text) to authenticated;

-- Pontos de ganhadora de desafio (chamado ao salvar o resultado)
create or replace function public.award_winner(cr uuid, ch uuid, place int) returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.can_mod('desafios') then raise exception 'Sem permissão'; end if;
  return public._award_rule(cr, 'desafio_ganhadora', ch, place || 'º lugar · ' || coalesce((select name from challenges where id = ch), 'desafio'));
end $$;
grant execute on function public.award_winner(uuid, uuid, int) to authenticated;

-- ---------- Gatilhos de pontos automáticos ----------
create or replace function public.tg_pts_app() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Aprovada' and old.status is distinct from 'Aprovada' then
    perform public._award_rule(new.creator_id, 'campanha_aprovada', new.campaign_id, (select name from campaigns where id = new.campaign_id));
  end if;
  return new;
end $$;
drop trigger if exists pts_app on public.campaign_applications;
create trigger pts_app after update of status on public.campaign_applications for each row execute function public.tg_pts_app();

create or replace function public.tg_pts_content() returns trigger language plpgsql security definer set search_path = public as $$
declare endd date; cname text;
begin
  select end_date, name into endd, cname from campaigns where id = new.campaign_id;
  if new.status = 'Aprovado' and old.status is distinct from 'Aprovado' then
    perform public._award_rule(new.creator_id, 'conteudo_aprovado', new.id, cname);
    if endd is null or new.created_at::date <= endd then perform public._award_rule(new.creator_id, 'entrega_no_prazo', new.id, cname); end if;
  end if;
  if new.status = 'Publicado' and old.status is distinct from 'Publicado' then
    perform public._award_rule(new.creator_id, 'conteudo_publicado', new.id, cname);
  end if;
  return new;
end $$;
drop trigger if exists pts_content on public.contents;
create trigger pts_content after update of status on public.contents for each row execute function public.tg_pts_content();

-- conteúdos registrados pela equipe já aprovados/publicados também pontuam
create or replace function public.tg_pts_content_ins() returns trigger language plpgsql security definer set search_path = public as $$
declare endd date; cname text;
begin
  select end_date, name into endd, cname from campaigns where id = new.campaign_id;
  if new.status in ('Aprovado','Publicado') then
    perform public._award_rule(new.creator_id, 'conteudo_aprovado', new.id, cname);
    if endd is null or new.created_at::date <= endd then perform public._award_rule(new.creator_id, 'entrega_no_prazo', new.id, cname); end if;
  end if;
  if new.status = 'Publicado' then perform public._award_rule(new.creator_id, 'conteudo_publicado', new.id, cname); end if;
  return new;
end $$;
drop trigger if exists pts_content_ins on public.contents;
create trigger pts_content_ins after insert on public.contents for each row execute function public.tg_pts_content_ins();

create or replace function public.tg_pts_sale() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator_id is not null and new.kind is distinct from 'Club Criadora' and new.status in ('Aprovada','Liberada','Paga')
     and (tg_op = 'INSERT' or old.status not in ('Aprovada','Liberada','Paga') or old.creator_id is distinct from new.creator_id) then
    perform public._award_rule(new.creator_id, 'venda', new.id, new.product);
  end if;
  return new;
end $$;
drop trigger if exists pts_sale on public.sales;
create trigger pts_sale after insert or update on public.sales for each row execute function public.tg_pts_sale();

create or replace function public.tg_pts_address() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.street is not null and new.zip is not null then perform public._award_rule(new.creator_id, 'perfil_completo', new.creator_id); end if;
  return new;
end $$;
drop trigger if exists pts_address on public.creator_addresses;
create trigger pts_address after insert or update on public.creator_addresses for each row execute function public.tg_pts_address();

-- ---------- Regras de acesso ----------
alter table public.levels enable row level security;
alter table public.point_rules enable row level security;
drop policy if exists lv_sel on public.levels; drop policy if exists lv_all on public.levels;
drop policy if exists pr_sel on public.point_rules; drop policy if exists pr_all on public.point_rules;
create policy lv_sel on public.levels for select using (auth.uid() is not null);
create policy lv_all on public.levels for all using (public.can_mod('gamificacao')) with check (public.can_mod('gamificacao'));
create policy pr_sel on public.point_rules for select using (auth.uid() is not null);
create policy pr_all on public.point_rules for all using (public.can_mod('gamificacao')) with check (public.can_mod('gamificacao'));
drop policy if exists cy_pts_sel on public.points_log;
create policy cy_pts_sel on public.points_log for select using (public.can_mod('creators') or public.can_mod('desafios') or public.can_mod('gamificacao') or creator_id = public.my_creator());
