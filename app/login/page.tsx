import AuthFrame from "@/components/AuthFrame";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthFrame>
      <div><span className="eyebrow">Bem-vinda de volta</span><h1 style={{ marginTop: 6 }}>Entre na sua conta</h1><p className="muted" style={{ marginTop: 6 }}>Você será levada automaticamente para o seu ambiente.</p></div>
      <LoginForm />
    </AuthFrame>
  );
}
