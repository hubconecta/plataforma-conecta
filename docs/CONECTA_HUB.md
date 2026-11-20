# CONECTA HUB · assinatura mensal das creators

## Como funciona
- **Creator Free**: toda creator aprovada (o cadastro continua passando por aprovação). Vê o menu "Conecta Hub", a página de venda e as áreas exclusivas com cadeado.
- **Conecta Hub** (R$ 37,00/mês, recorrente pela B4YOU): libera Campanhas exclusivas, Comunidade, TikTok Shop, Instagram, Conecta Academy, Desafios exclusivos e Materiais.
- O acesso fica ligado à conta que a creator já tem (sem conta nova). Uma assinatura por creator. O histórico fica em `subscription_events`.
- **Liberação só pelo webhook**: a volta do checkout mostra "aguardando confirmação" e não libera nada.
- **Regra única de acesso** no banco (`creator_has_hub` / `my_hub`), usada nas policies (RLS) de campanhas, desafios, aulas, grupos, conteúdos do Hub e aulas da Academy. Uma creator Free não lê esses dados nem por URL nem pela API.

| Situação | Acesso |
|---|---|
| Pagamento aprovado | ativa, período de 1 mês (a renovação soma a partir do fim do período anterior) |
| Renovação recusada ou atrasada | em atraso; mantém o acesso por **3 dias** depois do fim do período (configurável) |
| Cancelada | mantém o acesso até o fim do período pago |
| Reembolso ou chargeback | perde o acesso na hora e a venda é cancelada no financeiro |
| Liberação manual | até a data escolhida, sem carência, com motivo e autor registrados |

- **Rotina diária** (`/api/cron/lembretes`): marca o atraso quando a renovação não chega, expira quando a carência ou o período cancelado termina e avisa a creator.
- **Idempotência**:
  - Cada aviso gera uma chave única (`event_key`), que é reservada antes de qualquer mudança.
  - Se o mesmo aviso chega duas vezes, ou é reprocessado, a mudança não se repete.
  - Um pagamento repetido do mesmo pedido dentro de 20 dias também é ignorado.
  - A venda é registrada uma vez por cobrança e por mês.

## O que configurar
1. **Supabase**: rodar `supabase/23_conecta_hub.sql` no SQL Editor, depois do 22. O arquivo pode ser rodado de novo sem problema.
2. **B4YOU**:
   - Criar o produto de **assinatura** de R$ 37,00/mês.
   - Copiar o **ID do produto ou da oferta** e o **link do checkout**.
   - No webhook já existente (o mesmo do Club Criadora), marcar os eventos de assinatura: aprovada, renovada, recusada/atrasada, cancelada e reembolso/chargeback.
3. **Plataforma**: em Conecta Hub › Configurações, preencher o link do checkout e o ID do produto (valor e carência já vêm preenchidos). Depois, clicar em **Lançar Conecta Hub**: todas as creators Free recebem a notificação e um aviso fixado por 14 dias.
4. **Primeira venda real**: fazer uma assinatura de teste. Se o aviso cair em "Para revisar", copiar o ID correto ou escolher a creator ali mesmo.

## Testes executados (20/11/2026)
### Regras da assinatura: 39/39 OK
Simulação do webhook com o código real (`lib/b4.ts` e `lib/hub.ts`) sobre um banco em memória:
- Cobrança pendente não dá acesso.
- Pagamento aprovado:
  - ativa a assinatura por cerca de 1 mês;
  - registra a venda "Conecta Hub";
  - notifica a creator e a CEO;
  - não cria conta nem creator nova.
- Mesmo aviso reprocessado ou reenviado: não estende o período nem duplica a venda.
- Retry com payload diferente para o mesmo pedido: ignorado.
- Renovação no mês seguinte: estende a partir do fim anterior.
- Atraso:
  - carência = fim do período + 3 dias;
  - mantém o acesso dentro da carência e perde depois.
- Cancelamento: mantém o acesso até o fim do período, sem carência depois.
- Reembolso: retira o acesso na hora e cancela a venda.
- Nova assinatura depois do reembolso: reativa sem duplicar a assinatura.
- Creator "só da marca" que assina: passa para a base completa; o e-mail não diferencia maiúsculas.
- E-mail sem cadastro:
  - vai para "Para revisar", com a venda registrada;
  - a equipe escolhe a creator e o acesso é liberado sem duplicar a venda.
- Aviso de outro produto: não mexe nas assinaturas.
- Rotina diária:
  - ativa vencida passa para em atraso;
  - fim da carência expira a assinatura;
  - rodar de novo não duplica nada.
- Liberação manual: tem autor e motivo, expira na data sem carência e a retirada fica registrada.

### Segurança no banco (RLS): todos OK
Postgres local com todos os SQL de 01 a 23:
- **Creator Free**:
  - não vê campanhas, desafios ou aulas exclusivas;
  - não vê conteúdos do Hub, grupo Hub nem aulas da Academy;
  - vê só as quantidades na prévia.
- **Tentativas de burlar** (todas bloqueadas):
  - a Free criar uma assinatura ativa para si;
  - a Free se inscrever em campanha exclusiva;
  - a assinante estender ou alterar a própria assinatura.
- **Assinante**: vê tudo enquanto tem acesso.
- **Perda de acesso**:
  - em atraso há 4 dias (carência de 3) perde o acesso;
  - cancelada vencida e liberação manual vencida também perdem.
- **Equipe**: sem a permissão "Conecta Hub · assinaturas" não vê assinaturas; a CEO vê.
