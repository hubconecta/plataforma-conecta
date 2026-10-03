import AuthFrame from "@/components/AuthFrame";

export default function SemAcesso() {
  return (
    <AuthFrame>
      <div className="empty" style={{ borderStyle: "solid" }}>
        <h3>Seu acesso ainda não foi liberado</h3>
        <p>Sua conta existe, mas a Conecta ainda não definiu o seu perfil. Fale com a equipe Conecta.</p>
        <form action="/auth/signout" method="post"><button className="btn btn-ghost">Sair</button></form>
      </div>
    </AuthFrame>
  );
}
