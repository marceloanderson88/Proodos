import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-[#eee8e5] text-[#655854]",
  success: "bg-[#e8f5e9] text-[#28713c]",
  warning: "bg-[#fff1d8] text-[#87500e]",
  danger: "bg-[#fde7e8] text-[#98212a]",
  info: "bg-[#e5f1f7] text-[#285f7b]",
} as const;

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
