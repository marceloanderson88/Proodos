import {
  ArchiveRestore,
  CheckCircle2,
  CloudUpload,
  Database,
  FileLock2,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";

import { getFileIntegrationConfig } from "@/lib/files/server-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function FileIntegrationFoundation({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", organizationSlug)
    .maybeSingle();

  if (!organization) redirect("/o");

  const { count, error } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  const enabled = getFileIntegrationConfig().GOOGLE_DRIVE_UPLOAD_ENABLED;

  return (
    <div className="page-enter space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#751118]/10 bg-[#4a090e] px-6 py-8 text-white shadow-[0_28px_80px_rgba(73,18,20,0.16)] sm:px-9 sm:py-10">
        <div className="absolute -top-24 right-[-4rem] size-72 rounded-full border border-[#f4c47a]/15" />
        <div className="absolute -right-10 -bottom-28 size-64 rounded-full bg-[#a82b31]/25 blur-2xl" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f4c47a]/25 bg-[#f4c47a]/10 px-3 py-1.5 text-xs font-extrabold tracking-[0.13em] text-[#f6d7a5] uppercase">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Fundação segura · Marco 4
            </span>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight font-black sm:text-5xl">
              Arquivos grandes, sem transformar o Drive em banco de dados.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              {organization.name} já possui isolamento, estados e auditoria para
              arquivos. O adapter real permanece bloqueado até o spike do Shared
              Drive e a política institucional de retenção.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-xs font-bold tracking-[0.12em] text-white/55 uppercase">
              Adapter Google Drive
            </p>
            <div className="mt-3 flex items-center gap-2 font-extrabold">
              <span
                className={`size-2.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-[#f4c47a]"}`}
              />
              {enabled
                ? "Sinalizado para ativação"
                : "Desativado com segurança"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Database,
            eyebrow: "Supabase",
            title: "Metadados soberanos",
            text: "Permissões, versões, vínculos e histórico permanecem sob RLS.",
          },
          {
            icon: CloudUpload,
            eyebrow: "Google Drive",
            title: "Bytes desacoplados",
            text: "Uploads resumíveis serão ativados somente após validação externa.",
          },
          {
            icon: ArchiveRestore,
            eyebrow: "Ciclo de vida",
            title: "Falhas recuperáveis",
            text: "Lixeira, restauração, quarentena e reconciliação têm estados explícitos.",
          },
        ].map(({ icon: Icon, eyebrow, title, text }) => (
          <article key={title} className="dashboard-card rounded-[1.6rem] p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#921a20]/10 text-[#751118]">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-5 text-[0.68rem] font-black tracking-[0.14em] text-[#9c1d25] uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-lg font-black text-[#43090d]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#766868]">{text}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-card grid gap-6 rounded-[1.8rem] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff1dc] text-[#9c5414]">
            <FileLock2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-[#9c1d25] uppercase">
              Inventário real
            </p>
            <p className="mt-1 text-3xl font-black text-[#43090d]">
              {error ? "Indisponível" : (count ?? 0)}
            </p>
            <p className="mt-1 text-sm text-[#766868]">
              registros de arquivo visíveis para sua permissão atual — sem dados
              fictícios.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#751118]/8 px-5 py-3 text-sm font-extrabold text-[#751118]/55"
          title="Disponível após o spike do Google Drive"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Upload ainda indisponível
        </button>
      </section>
    </div>
  );
}
