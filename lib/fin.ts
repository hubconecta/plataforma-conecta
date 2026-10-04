// Mensagens de lembrete de pagamento (iguais ao protótipo aprovado).
export const brlFull = (n: number) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function reminderText(kind: string, brand: string, e: any, days = 0) {
  if (kind === "antes") return `Olá, ${brand}! Seu pagamento referente aos serviços da Conecta no valor de ${brlFull(e.value)} vence em ${days} dia${days === 1 ? "" : "s"}.`;
  if (kind === "dia") return `Olá, ${brand}! O pagamento referente aos serviços da Conecta (${brlFull(e.value)}) vence hoje.`;
  return `Olá, ${brand}! Identificamos que o pagamento referente a ${e.ref || e.description} (${brlFull(e.value)}) está pendente. Caso já tenha realizado o pagamento, desconsidere esta mensagem.`;
}
export const daysTo = (due: string, today: string) => Math.round((new Date(due + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) / 864e5);
export const kindFor = (due: string, today: string) => { const d = daysTo(due, today); return d > 0 ? "antes" : d === 0 ? "dia" : "depois"; };
