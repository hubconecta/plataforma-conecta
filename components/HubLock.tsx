import Link from "next/link";
import Icon from "./Icon";
import { brl2 } from "@/lib/hub-areas";

// Bloqueio das áreas exclusivas para a creator Free (o banco também não entrega os dados)
export default function HubLock({ title, desc, price = 37, compact }: { title?: string; desc?: string; price?: number; compact?: boolean }) {
  return (
    <div className={`hub-lock ${compact ? "compact" : ""}`}>
      <span className="hub-lock-ic" aria-hidden="true"><Icon name="lock" /></span>
      {title ? <span className="eyebrow">{title}</span> : null}
      <h2>Essa área é exclusiva do Conecta Hub.</h2>
      <p>{desc || "Tenha acesso a campanhas, oportunidades, conteúdos e recursos exclusivos para creators."}</p>
      <b className="hub-lock-price">{brl2(price)}<small>/mês</small></b>
      <Link href="/hub#assinar" className="btn hub-cta">DESBLOQUEAR CONECTA HUB</Link>
    </div>
  );
}
