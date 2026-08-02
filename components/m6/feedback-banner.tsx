import { CheckCircle2, TriangleAlert } from "lucide-react";

export function FeedbackBanner({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  const message = error ?? success;
  if (!message) return null;
  const isError = Boolean(error);
  const Icon = isError ? TriangleAlert : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-3 rounded-2xl border border-[#ad2b2f]/15 bg-[#fceaea] px-4 py-3 text-sm text-[#751118]"
          : "flex items-start gap-3 rounded-2xl border border-[#3d8b51]/15 bg-[#edf7ee] px-4 py-3 text-sm text-[#27643a]"
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p className="font-bold">{message}</p>
    </div>
  );
}
