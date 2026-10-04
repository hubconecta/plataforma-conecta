import Link from "next/link";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import LeadPublicForm from "./LeadPublicForm";
import WhatsAppFab from "@/components/WhatsAppFab";

export const metadata = { title: "Para marcas · Conecta" };
const SOLUTIONS: [string, string, string][] = [["users", "Gestão de influenciadores", "Seleção, contrato, briefing e acompanhamento das creators."], ["megaphone", "Campanhas com creators", "Campanhas de conteúdo e vendas com desafios e metas."], ["link", "Gestão de afiliados", "Programa de afiliadas com cupons, comissões e ranking."], ["film", "Campanhas de UGC", "Conteúdo autêntico para anúncios e redes da marca."], ["sparkle", "Gestão de comunidade", "Clube de creators engajadas com a sua marca."], ["target", "Estratégia de influência", "Planejamento, posicionamento e calendário."], ["chart", "Performance", "Acompanhamento de vendas, cliques e conversão."], ["play", "Campanhas de lançamento", "Lançamentos com prova social e escala."], ["user", "Gestão de creators", "Operação completa do relacionamento com creators."], ["box", "Ações com produtos", "Envio de produtos e logística acompanhada."], ["gift", "Press kits", "Press kits gratuitos ou vendidos para as creators."], ["plus", "Outras soluções", "Projetos sob medida para a sua marca."]];
const STEPS = ["Você conta o que busca no formulário.", "Nossa equipe entra em contato e entende seus objetivos.", "Apresentamos uma proposta sob medida.", "Com a parceria fechada, a Conecta cadastra sua marca e cria o seu acesso.", "Você acompanha campanhas, creators, conteúdos, resultados e financeiro no Portal da Marca."];

export default async function ParaMarcas() {
  let qs: any = { hasBudget: true, amount: true, creators: true, affiliates: true, agency: true };
  try { const { data } = await (await createClient()).from("settings").select("value").eq("key", "lead_qs").maybeSingle(); if (data?.value) qs = data.value; } catch {}
  return (
    <div className="site">
      <div className="site-nav"><span className="logo-crop" style={{ ["--w" as any]: "140px", display: "block" }}><img src="/logo-conecta.png" alt="Conecta" /></span>
        <nav><a className="btn btn-primary btn-sm" href="#form">Quero falar com a Conecta</a><Link className="btn btn-ghost btn-sm" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="/login">Entrar</Link></nav></div>
      <section className="site-hero"><div><span className="eyebrow" style={{ color: "#FF8CC4" }}>Para marcas</span><h1>Sua marca com as <em>creators certas.</em></h1><p>A Conecta cuida de toda a operação de influência: seleção de creators, campanhas, afiliadas, conteúdo, press kits e resultados, com um portal exclusivo para você acompanhar tudo.</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-primary" href="#form">QUERO FALAR COM A CONECTA</a><a className="btn btn-ghost" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="#form">QUERO SABER MAIS</a></div></div></section>
      <section className="site-sec"><span className="eyebrow">Soluções</span><h2>Como a Conecta pode trabalhar com a sua marca</h2><div className="grid g3">{SOLUTIONS.map(([i, t, p]) => <div className="card" key={t}><span className="alert-ic pink"><Icon name={i} /></span><h3 style={{ margin: "12px 0 6px" }}>{t}</h3><p className="muted small">{p}</p></div>)}</div></section>
      <section className="site-sec"><span className="eyebrow">Como funciona</span><h2>Do primeiro contato ao portal da sua marca</h2><div className="card"><ol className="steps">{STEPS.map((x) => <li key={x}>{x}</li>)}</ol></div></section>
      <section className="site-sec"><div className="card"><LeadPublicForm qs={qs} /></div><p className="small muted" style={{ marginTop: 10 }}>Nenhuma conta é criada agora: nosso time comercial entra em contato.</p></section>
      <footer className="site-foot"><div className="logo-crop" style={{ ["--w" as any]: "120px" }}><img src="/logo-conecta.png" alt="Conecta" /></div><Link className="link-btn" style={{ color: "#FF8CC4" }} href="/login">Já sou cliente · Entrar</Link></footer>
      <WhatsAppFab />
    </div>
  );
}
