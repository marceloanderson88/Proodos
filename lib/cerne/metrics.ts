import type { CerneSlot } from "@/lib/cerne/types";

export function calculateCerneCoverage(slots: CerneSlot[]) {
  const total = slots.length;
  const approved = slots.filter(
    (slot) => slot.status === "approved" || slot.status === "waived",
  ).length;
  const submitted = slots.filter((slot) => slot.status !== "pending").length;
  return {
    total,
    approved,
    submitted,
    approvedPercent: total ? Math.round((approved / total) * 100) : 0,
    submittedPercent: total ? Math.round((submitted / total) * 100) : 0,
  };
}
