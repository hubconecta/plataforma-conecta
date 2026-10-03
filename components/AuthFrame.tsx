export default function AuthFrame({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="logo-crop"><img src="/logo-conecta.png" alt="Conecta" /></div>
        <h2>{title || <>Conectamos marcas às <em>creators certas.</em></>}</h2>
        <div className="auth-envs"><span>Conecta ADM</span><span>Portal das Marcas</span><span>Clube Conecta</span></div>
      </section>
      <section className="auth-form"><div className="auth-card">{children}</div></section>
    </div>
  );
}
