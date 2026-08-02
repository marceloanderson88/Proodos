export default function Loading() {
  return (
    <main
      id="conteudo-principal"
      className="min-h-screen bg-[#fbf5ef] p-6"
      aria-busy="true"
      aria-label="Carregando conteúdo"
    >
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-12 w-64 rounded-xl bg-[#eadfd8]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-white lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-white" />
        </div>
      </div>
      <span className="sr-only">Carregando…</span>
    </main>
  );
}
