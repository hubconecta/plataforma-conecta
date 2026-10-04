import Link from "next/link";
import Icon from "@/components/Icon";
import WhatsAppFab from "@/components/WhatsAppFab";
import LeadPublicForm from "@/app/para-marcas/LeadPublicForm";

type P = { tab: "marca" | "creator"; qs: any; levels: { name: string; min_points: number; color: string; perks?: string }[]; wa: string };

const IG = "https://instagram.com/conectadigii";
const Insta = () => (
  <section className="site-sec"><a className="ig-band" href={IG} target="_blank" rel="noopener noreferrer"><span className="ig-dot" aria-hidden="true">IG</span><span style={{ flex: 1, minWidth: 200 }}><b>Siga a Conecta no Instagram</b><span>@conectadigii · bastidores, oportunidades e resultados da comunidade</span></span><span className="btn btn-primary btn-sm">Seguir @conectadigii</span></a></section>
);

const BRANDS = ["Anagrow", "Ella Intimy", "Ella Flow", "Popozão", "Cheiro de Rica", "Deluxe", "Alvya", "Nutravibe", "Liora", "Rosa Selvagem", "Belleton", "Renova Be", "Aurier", "Ella Wellness", "Gagi Vitaminas", "Emma Colchões", "Marias Babys by Virgínia Fonseca", "Lummy Fitwear", "Criamigos", "Cirúrgica Nova Era", "Casas Bahia", "Shein Kids", "Vhita"];
// Faixa com as marcas que já trabalharam com a Conecta (nomes em texto, rolando devagar)
const Brands = ({ title }: { title: string }) => (
  <section className="brands-band" aria-label={title}>
    <span className="eyebrow">{title}</span>
    <div className="marquee"><div className="marquee-track">{[...BRANDS, ...BRANDS].map((b, i) => <span key={i} className="brand-chip" aria-hidden={i >= BRANDS.length ? true : undefined}>{b}</span>)}</div></div>
    <ul className="sr-only">{BRANDS.map((b) => <li key={b}>{b}</li>)}</ul>
  </section>
);

const Faq = ({ items }: { items: [string, string][] }) => <div className="faq">{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
const Cards = ({ items }: { items: [string, string, string][] }) => <div className="grid g3">{items.map(([i, t, p]) => <div className="card" key={t}><span className="alert-ic pink"><Icon name={i} /></span><h3 style={{ margin: "12px 0 6px" }}>{t}</h3><p className="muted small">{p}</p></div>)}</div>;

export default function Landing({ tab, qs, levels, wa }: P) {
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Olá, Conecta! Quero conversar sobre a minha marca.")}` : "";
  return (
    <div className="site">
      <header className="site-nav">
        <Link href="/" aria-label="Conecta · início"><span className="logo-crop" style={{ ["--w" as any]: "140px", display: "block" }}><img src="/logo-conecta.png" alt="Conecta" /></span></Link>
        <nav className="site-switch" aria-label="Escolha seu perfil">
          <Link href="/?p=marca" className={tab === "marca" ? "on" : ""} aria-current={tab === "marca" ? "page" : undefined}>Sou marca</Link>
          <Link href="/?p=creator" className={tab === "creator" ? "on" : ""} aria-current={tab === "creator" ? "page" : undefined}>Sou creator</Link>
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><a className="ig-link" href={IG} target="_blank" rel="noopener noreferrer" aria-label="Instagram da Conecta @conectadigii">@conectadigii</a><Link className="btn btn-ghost btn-sm" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="/login">Entrar</Link></div>
      </header>

      {tab === "marca" ? <>
        <section className="site-hero"><div>
          <span className="eyebrow" style={{ color: "#FF8CC4" }}>Para marcas</span>
          <h1>Uma comunidade de creators <em>vendendo pela sua marca.</em></h1>
          <p>A Conecta cria e vive a comunidade entre a sua marca e as creators: uma base de creators afiliadas postando conteúdo e vendendo todos os dias, com desafios, press kits e acompanhamento de perto. E, quando a marca precisa, também abrimos campanhas com influenciadoras e UGC.</p>
          <div className="hero-ctas"><a className="btn btn-primary" href="#form">QUERO UMA COMUNIDADE PARA A MINHA MARCA</a><a className="btn btn-ghost" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="#form">QUERO FAZER UMA CAMPANHA</a>{waLink ? <a className="btn btn-ghost" style={{ background: "transparent", color: "#fff", borderColor: "#333" }} href={waLink} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a> : null}</div>
        </div></section>
        <Brands title="Marcas que já trabalharam com a Conecta" />

        <section className="site-sec"><span className="eyebrow">Como a Conecta trabalha</span><h2>Comunidade primeiro. Campanhas quando a marca precisar.</h2>
          <div className="grid g2">
            <div className="card offer dark"><span className="tag">Gestão · o coração da Conecta</span><h3>Comunidade de creators afiliadas</h3><p style={{ color: "#C9BFC6" }}>A Conecta monta, ativa e cuida da comunidade da sua marca todos os meses: creators que usam, postam e vendem seus produtos com link e cupom.</p><ul className="ul small" style={{ color: "#E9E1E7" }}><li>Base de creators afiliadas selecionadas para o seu nicho</li><li>Conteúdo constante: Reels, Stories e TikTok sobre a sua marca</li><li>Desafios, metas de vendas, ranking e premiações</li><li>Press kits, grupo da comunidade e acompanhamento diário</li><li>Comissões, vendas e resultados no Portal da Marca</li></ul><a className="btn btn-primary btn-sm" href="#form">Quero a gestão da comunidade</a></div>
            <div className="card offer"><span className="tag">Campanha</span><h3>Campanhas com influenciadoras e UGC</h3><p className="muted">Ações com começo, meio e fim: lançamento, data comemorativa, publi com influenciadoras ou vídeos UGC para anúncios.</p><ul className="ul small"><li>Seleção das creators ideais para o seu público</li><li>Briefing, aprovação de conteúdos e prazos</li><li>Envio de produtos e press kits acompanhado</li><li>Relatório de resultados no seu portal</li></ul><a className="btn btn-dark btn-sm" href="#form">Quero uma campanha</a></div>
          </div></section>

        <section className="site-sec"><span className="eyebrow">Soluções</span><h2>O que a Conecta faz pela sua marca</h2>
          <Cards items={[["users", "Comunidade de creators", "Uma base viva de creators falando da sua marca todos os dias."], ["link", "Afiliadas e comissões", "Creators vendendo com link e cupom, com comissão acompanhada pela Conecta."], ["megaphone", "Campanhas com influenciadoras", "Publis e lançamentos com creators selecionadas para o seu nicho."], ["film", "UGC", "Vídeos autênticos para anúncios, site e redes sociais."], ["trophy", "Desafios e premiações", "Metas de conteúdo e vendas que engajam a comunidade."], ["gift", "Press kits e amostras", "Envio de produtos com logística e endereço protegidos."], ["chart", "Resultados e relatórios", "Vendas, comissões, conteúdos e ganhadoras no seu portal."]]} /></section>

        <section className="site-sec"><span className="eyebrow">Como funciona</span><h2>Do primeiro contato ao portal da sua marca</h2><div className="card"><ol className="steps">{["Você conta o que busca no formulário abaixo.", "Nosso time comercial entra em contato e entende seus objetivos.", "Apresentamos uma proposta de campanha ou de gestão sob medida.", "Com a parceria fechada, a Conecta cadastra sua marca e cria o seu acesso.", "Você acompanha campanhas, creators, conteúdos, envios, resultados e financeiro no Portal da Marca."].map((x) => <li key={x}>{x}</li>)}</ol></div></section>

        <section className="site-sec" id="form"><div className="card"><LeadPublicForm qs={qs} /></div><p className="small muted">Nenhuma conta é criada agora: nosso time comercial entra em contato pelo WhatsApp ou e-mail informado.</p></section>

        <section className="site-sec"><span className="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2><Faq items={[["Preciso ter uma verba mínima?", "Não. Montamos a proposta de acordo com o seu objetivo: pode ser uma campanha pontual, permuta com press kits ou a gestão completa."], ["O que é a comunidade de creators afiliadas?", "É uma base de creators que usam seus produtos, postam com frequência e vendem com link ou cupom, ganhando comissão. A Conecta seleciona, ativa, organiza desafios e acompanha tudo de perto: é o nosso principal trabalho."], ["Qual a diferença entre gestão e campanha?", "Na gestão, a Conecta cuida da comunidade da sua marca todos os meses. A campanha é uma ação com prazo definido, com influenciadoras ou UGC."], ["Como acompanho os resultados?", "Pelo Portal da Marca: campanhas, creators aprovadas, conteúdos publicados, envios, ganhadoras dos desafios e o relatório da sua marca, atualizado a cada resultado."], ["Vocês trabalham com afiliadas?", "Sim. As creators vendem com link ou cupom e a comissão é acompanhada pela Conecta."]]} /></section>
      </> : <>
        <section className="site-hero"><div>
          <span className="eyebrow" style={{ color: "#FF8CC4" }}>Para creators</span>
          <h1>Faça parte da comunidade <em>Conecta.</em></h1>
          <p>A Conecta é uma comunidade de creators afiliadas que postam, vendem e crescem junto com as marcas. Aqui você ganha comissão nas suas vendas, recebe press kits, participa de desafios com prêmios e evolui com o apoio do time e das outras creators. E também abrimos campanhas para influenciadoras e UGC.</p>
          <div className="hero-ctas"><Link className="btn btn-primary" href="/cadastro">QUERO FAZER PARTE</Link><Link className="btn btn-ghost" style={{ background: "#111", color: "#fff", borderColor: "#333" }} href="/login">Já sou creator · Entrar</Link></div>
        </div></section>
        <Brands title="Marcas que já passaram pela comunidade Conecta" />

        <section className="site-sec"><span className="eyebrow">O que é a Conecta</span><h2>Mais que campanhas: uma comunidade entre creators e marcas</h2>
          <p className="muted" style={{ maxWidth: "70ch" }}>Na Conecta você vive a marca de perto: usa os produtos, cria conteúdo de verdade, vende com o seu link ou cupom e ganha comissão. Tem grupo da comunidade, desafios, ranking e o time Conecta te acompanhando. Tudo fica no app: oportunidades, conteúdos, envios, pontos e ganhos.</p>
          <Cards items={[["coins", "Comissão nas vendas", "Venda com link e cupom das marcas parceiras e acompanhe suas comissões no app."], ["users", "Comunidade de verdade", "Grupo da comunidade, trocas entre creators e apoio do time Conecta."], ["trophy", "Desafios com prêmios", "Metas de conteúdo e vendas com ranking e premiação."], ["gift", "Press kits e recebidos", "Produtos das marcas parceiras direto na sua casa."], ["megaphone", "Campanhas com marcas", "Publis, UGC e permutas de acordo com o seu perfil e nicho."], ["book", "Club Criadora", "Método Criadora Expert, presets e cursos para você crescer."], ]} /></section>

        <section className="site-sec"><span className="eyebrow">Para quem é</span><h2>Escolha como você quer trabalhar</h2>
          <div className="grid g3">{[["Creator afiliada", "O coração da Conecta: você usa, posta e vende com link e cupom, ganhando comissão em cada venda.", true], ["Influenciadora", "Você tem audiência e quer fechar publis e parcerias com marcas.", false], ["UGC Creator", "Você cria vídeos e fotos para as marcas usarem nos anúncios e redes, sem precisar de muitos seguidores.", false]].map(([t, p, main]) => <div className={`card ${main ? "offer dark" : ""}`} key={t as string}>{main ? <span className="tag">Principal na Conecta</span> : null}<h3 style={{ margin: "6px 0" }}>{t}</h3><p className={main ? "small" : "muted small"} style={main ? { color: "#C9BFC6" } : undefined}>{p}</p></div>)}</div></section>

        {levels.length ? <section className="site-sec"><span className="eyebrow">Níveis</span><h2>Cada entrega vale pontos. Suba de nível com a Conecta.</h2>
          <div className="lv-steps">{levels.map((l, i) => <div key={l.name} className="lv-step" style={{ ["--lv" as any]: l.color }}><span className="eyebrow">Nível {i + 1}</span><span className="lvl" style={{ ["--lv" as any]: l.color }}>★ {l.name}</span>{l.perks ? <p className="small">{l.perks}</p> : null}</div>)}</div>
          <p className="small muted">Campanhas aprovadas, conteúdos no prazo, vendas e desafios somam pontos no seu perfil.</p></section> : null}

        <section className="site-sec"><span className="eyebrow">Como funciona</span><h2>Do cadastro à primeira campanha</h2><div className="card"><ol className="steps">{["Preencha o cadastro com seus dados, redes e nicho.", "O time Conecta analisa o seu perfil.", "Aprovada, você recebe o link de acesso ao Clube Conecta.", "Veja as oportunidades que combinam com você e se inscreva.", "Entregue os conteúdos, acompanhe envios, pontos e ganhos no app."].map((x) => <li key={x}>{x}</li>)}</ol></div>
          <div className="hero-ctas"><Link className="btn btn-primary" href="/cadastro">QUERO ME CADASTRAR</Link></div></section>

        <section className="site-sec"><span className="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2><Faq items={[["Preciso ter muitos seguidores?", "Não. A Conecta é focada em creators afiliadas: o que importa é postar com constância, criar conteúdo verdadeiro e ter vontade de vender. Também abrimos campanhas para influenciadoras e UGC."], ["Como ganho dinheiro sendo afiliada?", "Você recebe seu link ou cupom das marcas parceiras, posta conteúdo e ganha comissão por cada venda. Suas vendas e comissões aparecem no app."], ["Quanto custa para participar?", "O cadastro no Clube Conecta é gratuito. Cursos do Club Criadora são opcionais."], ["Como recebo as oportunidades?", "Pelo app: você recebe notificação quando abre uma campanha que combina com o seu perfil e se inscreve com um toque."], ["Como funcionam os press kits?", "Você cadastra seu endereço no perfil. Ele fica protegido e só é usado quando há um envio autorizado para você."]]} /></section>
      </>}

      <Insta />
      <footer className="site-foot"><div className="logo-crop" style={{ ["--w" as any]: "120px" }}><img src="/logo-conecta.png" alt="Conecta" /></div>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><Link className="link-btn" style={{ color: "#C9BFC6" }} href="/?p=marca">Sou marca</Link><Link className="link-btn" style={{ color: "#C9BFC6" }} href="/?p=creator">Sou creator</Link><a className="link-btn" style={{ color: "#C9BFC6" }} href={IG} target="_blank" rel="noopener noreferrer">Instagram @conectadigii</a><Link className="link-btn" style={{ color: "#FF8CC4" }} href="/login">Entrar</Link></nav></footer>
      <WhatsAppFab />
    </div>
  );
}
