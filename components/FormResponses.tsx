// Tabela de respostas de um formulário (equipe e Portal da Marca).
import Link from "next/link";
import CopyText from "@/components/CopyText";
import { Empty } from "@/components/ui";

export const showAnswer = (v: any, type: string, sensitive: boolean) => {
  if (v == null || v === "") return "";
  if (!sensitive && ["cpf", "endereco"].includes(type)) return "protegido";
  if (type === "endereco" && typeof v === "object") return v.street ? `${v.street || ""}, ${v.number || ""}${v.comp ? " " + v.comp : ""} · ${v.district || ""} · ${v.city || ""}/${v.uf || ""} · ${v.cep || ""}` : "";
  return Array.isArray(v) ? v.join(", ") : String(v);
};

export default function FormResponses({ fields, resp, sensitive, join, creatorHref }: { fields: any[]; resp: any[]; sensitive: boolean; join?: boolean; creatorHref?: (id: string) => string }) {
  const head = ["Quando", "Creator", ...(join ? ["Base Conecta"] : []), ...fields.map((x) => x.label)];
  const tsv = [head.join("\t"), ...resp.map((r: any) => [new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), r.creators?.name || "visitante", ...(join ? [r.join_conecta ? "Sim" : "Não"] : []), ...fields.map((x) => showAnswer(r.answers?.[x.id], x.type, sensitive).replace(/\s+/g, " "))].join("\t"))].join("\n");
  return (
    <div className="card"><div className="card-h"><h2>{resp.length} respostas</h2>{resp.length ? <CopyText text={tsv} label="Copiar para planilha" /> : null}</div>
      {resp.length ? <div className="table-wrap"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{resp.map((r: any) => <tr key={r.id}>
        <td className="num small">{new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
        <td>{r.creator_id && creatorHref ? <Link href={creatorHref(r.creator_id)}>{r.creators?.name || "creator"}</Link> : r.creators?.name || "visitante"}</td>
        {join ? <td className="small">{r.join_conecta ? "✅ Sim" : "Não"}</td> : null}
        {fields.map((x) => { const v = showAnswer(r.answers?.[x.id], x.type, sensitive); return <td key={x.id} className="small">{x.type === "upload" && v.startsWith("http") ? <a href={v} target="_blank" rel="noopener noreferrer">Abrir</a> : v}</td>; })}
      </tr>)}</tbody></table></div> : <Empty icon="inbox" title="Nenhuma resposta ainda" text="Envie o link do formulário para as creators." />}
    </div>
  );
}
