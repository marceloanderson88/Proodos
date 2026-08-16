export function selectionReceiptCookieName(slug: string) {
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  return `selection-receipt-${safeSlug || "call"}`;
}
