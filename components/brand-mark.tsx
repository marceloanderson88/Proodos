import { BrainCircuit, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function BrandMark({
  compact = false,
  inverse = false,
  className,
}: BrandMarkProps) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      aria-label="Incubadora Sertão Maker"
    >
      <div
        className={cn(
          "relative grid size-12 shrink-0 place-items-center rounded-2xl border",
          inverse
            ? "border-white/25 bg-white/10 text-white"
            : "border-[#921a20]/15 bg-[#921a20]/8 text-[#751118]",
        )}
      >
        <BrainCircuit aria-hidden="true" className="size-7" strokeWidth={1.8} />
        <Sparkles
          aria-hidden="true"
          className={cn(
            "absolute -top-1 -right-1 size-4",
            inverse ? "text-[#f4c47a]" : "text-[#a65f48]",
          )}
          fill="currentColor"
        />
      </div>
      {!compact && (
        <div
          className={cn(
            "leading-none",
            inverse ? "text-white" : "text-[#5c0c12]",
          )}
        >
          <span className="block text-[0.68rem] font-extrabold tracking-[0.2em] uppercase opacity-75">
            Incubadora
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-black tracking-[-0.03em] uppercase">
            Sertão Maker
          </span>
        </div>
      )}
    </div>
  );
}
