"use client";

import { Download } from "lucide-react";

type ExportRow = Record<string, string | number | null>;

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function ReportExportButton({
  filename,
  rows,
}: {
  filename: string;
  rows: ExportRow[];
}) {
  function download() {
    const firstRow = rows[0];
    if (!firstRow) return;
    const headers = Object.keys(firstRow);
    const csv = [
      headers.map(csvCell).join(";"),
      ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(";")),
    ].join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={!rows.length}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#5c0c12] shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Download className="size-4" /> Exportar CSV
    </button>
  );
}
