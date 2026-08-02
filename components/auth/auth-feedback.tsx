import { CircleAlert, CircleCheck } from "lucide-react";

type AuthFeedbackProps = {
  message: string;
  tone?: "error" | "success";
};

export function AuthFeedback({ message, tone = "error" }: AuthFeedbackProps) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      className={
        tone === "success"
          ? "flex gap-3 rounded-xl border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          : "flex gap-3 rounded-xl border border-[#ad2b2f]/20 bg-[#fff0ef] px-4 py-3 text-sm text-[#751118]"
      }
      role={tone === "success" ? "status" : "alert"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
