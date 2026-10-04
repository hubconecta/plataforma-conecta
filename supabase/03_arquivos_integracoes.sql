-- =====================================================================
-- CONECTA · Entrega 3 · Arquivos (aulas, fotos) e integração B4YOU
-- Rode DEPOIS do 02_modulos.sql. Pode rodar de novo sem problema.
-- =====================================================================

-- Pastas de arquivos:
--  "metodo"  → privada: vídeos, PDFs e capas das aulas (só quem comprou vê, por link temporário)
--  "publico" → pública: fotos de press kits e capas de módulos
insert into storage.buckets (id, name, public, file_size_limit)
values ('metodo', 'metodo', false, 52428800), ('publico', 'publico', true, 10485760)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Capas e arquivos do Método
alter table public.method_modules add column if not exists cover_path text;
alter table public.method_lessons add column if not exists video_path text;
alter table public.method_lessons add column if not exists pdf_path text;
alter table public.method_lessons add column if not exists thumb_path text;
alter table public.press_kits add column if not exists photo_path text;

-- Eventos recebidos da B4YOU (guardamos tudo para conferência)
create table if not exists public.b4_events (
  id uuid primary key default gen_random_uuid(),
  event text, status text not null default 'Recebido' check (status in ('Recebido','Processado','Para revisar','Ignorado')),
  email text, product text, value numeric(12,2), order_code text,
  creator_id uuid references public.creators(id) on delete set null,
  note text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.b4_events enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'b4_events' loop
    execute format('drop policy %I on public.b4_events', r.policyname);
  end loop;
end $$;
create policy cz_b4_sel on public.b4_events for select using (public.is_ceo() or public.can_mod('metodo_adm') or public.can_mod('fin'));
create policy cz_b4_upd on public.b4_events for update using (public.is_ceo() or public.can_mod('metodo_adm') or public.can_mod('fin'));

-- Configurações da integração (o segredo do webhook só a CEO vê)
insert into public.settings (key, value) values ('b4you', '{"token":"","metodo_product":""}') on conflict (key) do nothing;

-- Pedido de compra do Método também guarda o e-mail usado no checkout
alter table public.method_purchases add column if not exists email text;

-- Regra de configurações: "b4you" fica fora da leitura pública
drop policy if exists cy_set_sel on public.settings;
create policy cy_set_sel on public.settings for select using ((key in ('whatsapp','metodo','lead_qs')) or (public.is_staff() and key <> 'b4you') or public.is_ceo());
