-- =====================================================================
-- CONECTA · Notificações para toda a equipe
-- • Tudo o que uma pessoa da equipe faz avisa as outras (CEO, colaboradoras
--   e financeiro) que têm acesso àquele módulo.
-- • Avisos de marcas/creators chegam também para quem cuida do assunto
--   (ex.: nova creator → quem tem "Cadastros" ou "Creators").
-- • O financeiro passa a usar Tarefas e Calendário (pode passar tarefas para a CEO).
-- Rode depois do 12. Pode rodar de novo sem problema.
-- =====================================================================

-- Quem da equipe tem acesso a um módulo (mesma regra das telas)
create or replace function public.staff_can(r text, perms text[], st text, m text) returns boolean language sql immutable as $$
  select coalesce(st = 'ativo' and (
    r = 'ceo'
    or (r = 'equipe' and (m in ('calendario','ops','etiquetas') or m = any(coalesce(perms, '{}'))))
    or (r = 'financeiro' and m in ('fin','vendas','cobrancas','demandas','calendario'))), false);
$$;

create or replace function public.can_mod(m text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles p where p.id = auth.uid() and public.staff_can(p.role, p.perms, p.status, m));
$$;

-- Assuntos ligados: quem cuida de um também recebe o aviso do outro
create or replace function public.related_mod(m text) returns text language sql immutable as $$
  select case m when 'gamificacao' then 'creators' when 'cad_creators' then 'creators' when 'candidaturas' then 'campanhas'
    when 'campanhas' then 'candidaturas' when 'conteudos' then 'campanhas' when 'amostras' then 'presskits' when 'presskits' then 'amostras' end;
$$;

create or replace function public.notify_staff(m text, msg text, lnk text) returns void language plpgsql security definer set search_path = public as $$
declare x text := public.related_mod(m);
begin
  insert into notifications (user_id, text, link)
  select p.id, msg, lnk from profiles p
  where p.role in ('ceo','equipe','financeiro')
    and (public.staff_can(p.role, p.perms, p.status, m) or (x is not null and public.staff_can(p.role, p.perms, p.status, x)))
    and p.id is distinct from auth.uid();
end $$;
revoke execute on function public.notify_staff(text, text, text) from public, anon, authenticated;

-- Nova creator cadastrada → CEO e quem cuida de cadastros/creators
create or replace function public.notify_new_application() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_staff('cad_creators', '🆕 Nova creator cadastrada: ' || new.name || coalesce(' (' || new.instagram || ')', ''), '/cadastros');
  return new;
end $$;

-- Etiquetas: o financeiro também usa (nas tarefas e no calendário)
create or replace function public.is_team() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and status = 'ativo' and role in ('ceo','equipe','financeiro'));
$$;

-- ---------- Tudo o que a equipe faz avisa o resto da equipe ----------
create or replace function public.audit_mod(label text) returns text language sql immutable as $$
  select case label
    when 'Tarefas' then 'demandas' when 'Calendário' then 'calendario' when 'Campanhas' then 'campanhas'
    when 'Inscrições' then 'candidaturas' when 'Desafios' then 'desafios' when 'Conteúdos' then 'conteudos'
    when 'Press kits' then 'presskits' when 'Envios' then 'amostras' when 'Formulários' then 'formularios'
    when 'Leads' then 'crm' when 'Relatórios' then 'relatorios' when 'Marcas' then 'marcas' when 'Acesso da marca' then 'marcas'
    when 'Creators' then 'creators' when 'Cadastros de creators' then 'cad_creators' when 'Níveis e pontos' then 'gamificacao'
    when 'Club Criadora' then 'metodo_adm' when 'Comunidade' then 'campanhas'
    when 'Financeiro' then 'fin' when 'Vendas' then 'fin' when 'Cobranças' then 'fin'
    when 'Acessos' then 'so_ceo' when 'Colaboradoras' then 'so_ceo' when 'Configurações' then 'so_ceo' when 'Integrações' then 'so_ceo'
  end;
$$;

create or replace function public.mod_link(m text) returns text language sql immutable as $$
  select case m
    when 'demandas' then '/tarefas' when 'calendario' then '/calendario' when 'campanhas' then '/campanhas'
    when 'candidaturas' then '/inscricoes' when 'desafios' then '/desafios' when 'conteudos' then '/conteudos'
    when 'presskits' then '/presskits' when 'amostras' then '/envios' when 'formularios' then '/formularios'
    when 'crm' then '/leads' when 'relatorios' then '/relatorios' when 'marcas' then '/marcas' when 'creators' then '/creators'
    when 'cad_creators' then '/cadastros' when 'gamificacao' then '/gamificacao' when 'metodo_adm' then '/club/admin'
    when 'fin' then '/financeiro' else '/historico' end;
$$;

create or replace function public.tg_audit_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare a record; m text; lnk text; msg text;
begin
  select role, name into a from profiles where id = new.user_id;
  if a is null or a.role not in ('ceo','equipe','financeiro') then return new; end if; -- marcas/creators têm avisos próprios
  m := public.audit_mod(new.module);
  if m is null then return new; end if;
  if new.financial and m <> 'so_ceo' then m := 'fin'; end if;
  lnk := public.mod_link(m);
  msg := left('👤 ' || coalesce(nullif(new.who, ''), a.name, 'Equipe') || ' ' || new.action, 300);
  insert into notifications (user_id, text, link)
  select p.id, msg, lnk from profiles p
  where p.id <> new.user_id and p.role in ('ceo','equipe','financeiro')
    and public.staff_can(p.role, p.perms, p.status, m)
    -- quem acabou de receber um aviso direto sobre a mesma coisa não recebe de novo
    and not exists (select 1 from notifications n where n.user_id = p.id and n.created_at > now() - interval '20 seconds'
                    and n.text not like '👤%' and split_part(coalesce(n.link, ''), '?', 1) = lnk);
  return new;
exception when others then return new; -- aviso nunca impede a ação
end $$;
drop trigger if exists audit_notify on public.audit_logs;
create trigger audit_notify after insert on public.audit_logs for each row execute function public.tg_audit_notify();

-- ---------- Tarefas: aviso direto para quem recebe a tarefa ----------
-- (vale para tarefas criadas por qualquer pessoa: CEO, colaboradora ou financeiro)
create or replace function public.tg_task_assign() returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if new.owner_id is not null and new.owner_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    select coalesce(name, email) into who from profiles where id = auth.uid();
    insert into notifications (user_id, text, link)
    values (new.owner_id, '📝 ' || coalesce(who, 'A equipe') || ' passou uma tarefa para você: ' || new.title
      || coalesce(' · prazo ' || to_char(new.due, 'DD/MM'), ''), '/tarefas');
  end if;
  return new;
end $$;
drop trigger if exists task_assign on public.tasks;
create trigger task_assign after insert or update of owner_id on public.tasks for each row execute function public.tg_task_assign();

-- Compromisso marcado na agenda de outra pessoa
create or replace function public.tg_event_assign() returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if new.owner_id is not null and new.owner_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    select coalesce(name, email) into who from profiles where id = auth.uid();
    insert into notifications (user_id, text, link)
    values (new.owner_id, '📅 ' || coalesce(who, 'A equipe') || ' marcou na sua agenda: ' || new.title || ' em ' || to_char(new.day, 'DD/MM')
      || coalesce(' às ' || to_char(new.start_time, 'HH24:MI'), ''), '/calendario?m=' || to_char(new.day, 'YYYY-MM') || '&dia=' || new.day);
  end if;
  return new;
end $$;
drop trigger if exists event_assign on public.calendar_events;
create trigger event_assign after insert or update of owner_id on public.calendar_events for each row execute function public.tg_event_assign();
