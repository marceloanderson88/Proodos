import Link from "next/link";

import { AuthCardPage } from "@/components/auth/auth-card-page";
import { AuthFeedback } from "@/components/auth/auth-feedback";

export const metadata = { title: "Não foi possível autenticar" };

export default function AuthErrorPage() {
  return (
    <AuthCardPage
      eyebrow="Acesso protegido"
      title="Não foi possível concluir"
      description="O link pode ter expirado, sido utilizado ou não corresponder a uma sessão válida."
    >
      <div className="mt-7 space-y-5">
        <AuthFeedback message="Tente entrar novamente. Para redefinir a senha, solicite um novo link de recuperação." />
        <Link
          href="/login"
          className="block rounded-xl bg-[#751118] px-5 py-4 text-center font-extrabold text-white"
        >
          Ir para o acesso
        </Link>
      </div>
    </AuthCardPage>
  );
}
