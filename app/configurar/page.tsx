export default function Configurar() {
  return (
    <div className="signup">
      <div className="logo-crop" style={{ ["--w" as any]: "160px", background: "#000", borderRadius: 12 }}><img src="/logo-conecta.png" alt="Conecta" /></div>
      <h1>Falta conectar o banco de dados</h1>
      <p className="muted">A plataforma foi publicada, mas ainda não sabe qual é o banco da Conecta. Na Vercel, abra o projeto → Settings → Environment Variables e cadastre as variáveis do arquivo <b>.env.example</b>. Depois clique em Redeploy.</p>
    </div>
  );
}
