export function ErrorReference({ reference }: { reference?: string }) {
  if (!reference) return null;

  return (
    <p className="mt-4 text-xs font-bold tracking-wide text-current/60">
      Referência para suporte: <code>{reference}</code>
    </p>
  );
}
