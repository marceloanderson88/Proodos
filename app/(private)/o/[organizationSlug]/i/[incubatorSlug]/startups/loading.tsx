export default function StartupsLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Carregando startups">
      <div className="h-56 rounded-[2rem] bg-[#eadbd3]" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-72 rounded-[1.7rem] bg-white shadow-sm" />
        <div className="h-72 rounded-[1.7rem] bg-white shadow-sm" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-[1.7rem] bg-white shadow-sm" />
        <div className="h-64 rounded-[1.7rem] bg-white shadow-sm" />
      </div>
      <span className="sr-only">Carregando portfólio de startups…</span>
    </div>
  );
}
