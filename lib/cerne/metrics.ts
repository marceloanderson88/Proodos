import type { CerneSlot } from "@/lib/cerne/types";

export function calculateCerneCoverage(slots: CerneSlot[]) {
  const requiredSlots = slots.filter((slot) => slot.required !== false);
  const total = requiredSlots.length;
  const approved = requiredSlots.filter(
    (slot) => slot.status === "approved" || slot.status === "waived",
  ).length;
  const submitted = requiredSlots.filter(
    (slot) => slot.status !== "pending",
  ).length;
  const rejected = requiredSlots.filter(
    (slot) => slot.status === "rejected",
  ).length;
  return {
    total,
    approved,
    submitted,
    rejected,
    pending: Math.max(0, total - submitted),
    optional: slots.length - total,
    approvedPercent: total ? Math.round((approved / total) * 100) : 0,
    submittedPercent: total ? Math.round((submitted / total) * 100) : 0,
  };
}
