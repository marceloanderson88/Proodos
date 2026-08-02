import { AuthCardPage } from "@/components/auth/auth-card-page";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata = { title: "Recuperar senha" };

export default function PasswordRecoveryPage() {
  return (
    <AuthCardPage
      eyebrow="Segurança da conta"
      title="Recupere seu acesso"
      description="Informe seu e-mail. Por segurança, a resposta será a mesma exista ou não uma conta cadastrada."
    >
      <PasswordRecoveryForm />
    </AuthCardPage>
  );
}
