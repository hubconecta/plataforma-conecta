# Como colocar a Conecta no ar (passo a passo)

Tempo estimado: 30 minutos. Não mande senhas nem chaves por mensagem para ninguém.

## 1. Banco de dados (Supabase)
1. Abra o projeto **conecta** no supabase.com.
2. Menu **SQL Editor** → **New query**.
3. Abra o arquivo `supabase/01_fundacao.sql` aqui no GitHub, copie tudo, cole no editor e clique em **Run**.
   Deve aparecer "Success". Pode rodar de novo no futuro sem perder dados.

## 2. Login seguro (Supabase → Authentication)
1. **Sign In / Providers → Email**: desligue **Allow new users to sign up**.
   Ninguém cria conta sozinho; só a Conecta convida (creators usam o formulário de cadastro, que não cria login).
2. **URL Configuration**:
   - **Site URL**: o endereço da plataforma na Vercel (ex.: `https://plataforma-conecta.vercel.app`).
   - **Redirect URLs**: adicione `https://SEU-ENDERECO/auth/confirm` e `https://SEU-ENDERECO/**`.
3. **Emails → Templates** (opcional; o Supabase só deixa editar depois de configurar SMTP próprio, ex.: Resend. Os modelos padrão já funcionam com a plataforma):
   - **Invite user**: assunto `Seu acesso à plataforma Conecta`. Troque o link do botão por
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/nova-senha`
   - **Reset password**: troque o link por
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha`

## 3. Seu acesso de CEO
1. **Authentication → Users → Add user → Create new user**: seu e-mail e uma senha forte, com **Auto Confirm** marcado.
2. Volte ao **SQL Editor** e rode (troque o e-mail e o nome):
   ```sql
   update profiles set role = 'ceo', name = 'Leandra' where email = 'seu@email.com';
   ```

## 4. Ligar a Vercel ao banco
1. No Supabase: **Project Settings → API Keys** (ou **API**).
2. Na Vercel: projeto **plataforma-conecta** → **Settings → Environment Variables**. Cadastre:
   | Nome | Onde pegar |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Publishable key (ou "anon public") |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Secret key (ou "service_role"). **Segredo.** |
   | `NEXT_PUBLIC_SITE_URL` | O endereço da plataforma na Vercel |
3. **Deployments** → no último → **⋯ → Redeploy**.

## 5. Testar
1. Abra o endereço da plataforma e entre com seu e-mail de CEO.
2. **Colaboradoras → Nova colaboradora**: convide sua assistente e marque as permissões.
3. **Marcas → Nova marca** → abra a marca → **Criar acesso e enviar e-mail**.
4. Mande o link `SEU-ENDERECO/cadastro` para uma creator de teste, aprove em **Cadastros de creators**.

## Observação sobre e-mails
O Supabase gratuito envia poucos e-mails por hora. Para uso real, configure um envio próprio:
Supabase → **Authentication → Emails → SMTP Settings**, usando o Resend (resend.com). A gente faz isso junto na próxima etapa.

## 6. Módulos completos (Entregas 2 e 3)
1. No **SQL Editor**, rode também, nesta ordem: `supabase/02_modulos.sql`, `supabase/03_arquivos_integracoes.sql`, `supabase/04_calendario.sql`, `supabase/05_club_criadora.sql`, `supabase/06_notificacoes.sql`, `supabase/07_push.sql`, `supabase/08_receitas.sql`, `supabase/09_campanhas_detalhes.sql` e `supabase/10_niveis_pontos.sql`
   (se o Supabase mostrar "Potential issues", clique em **Run and enable RLS**).
2. **Lembretes automáticos de pagamento:** na Vercel, adicione a variável `CRON_SECRET` (Secret) com uma senha longa
   qualquer e faça Redeploy. A Vercel chama `/api/cron/lembretes` todo dia às 9h (horário de Brasília).
3. **Método + B4YOU:** em Gerenciar Método → Vendas e integração, cole o link do checkout, informe o ID/nome do
   produto do Método na B4YOU e clique em Salvar. Copie o endereço do webhook e cadastre na B4YOU
   (Apps → Webhooks), marcando compra aprovada e reembolso. Faça uma compra de teste e confira em
   "Eventos recebidos da B4YOU".
4. **WhatsApp flutuante:** Configurações → número com DDD.
5. Vídeos longos do Método: use link do Panda Video, YouTube (não listado) ou Vimeo. Upload direto aceita até 50 MB.
