import Image from "next/image";

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
      className={cn(
        "inline-flex shrink-0 items-center",
        inverse &&
          "rounded-xl border border-white/20 bg-[#fffaf5]/95 p-2 shadow-[0_12px_32px_rgba(38,6,9,0.18)]",
        className,
      )}
      aria-label="Incubadora Sertão Maker"
    >
      <Image
        src={
          compact
            ? "/brand/sertao-maker-symbol-transparent.png"
            : "/brand/sertao-maker-logo-transparent.png"
        }
        alt=""
        width={compact ? 508 : 2870}
        height={compact ? 759 : 838}
        sizes={compact ? "48px" : inverse ? "188px" : "240px"}
        priority
        className={cn(
          "h-auto object-contain",
          compact ? "w-8" : inverse ? "w-[11.75rem]" : "w-[min(15rem,72vw)]",
        )}
      />
    </div>
  );
}
