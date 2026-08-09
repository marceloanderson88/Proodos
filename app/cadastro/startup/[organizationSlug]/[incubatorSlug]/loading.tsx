export default function StartupRegistrationLoading() {
  return (
    <main className="min-h-screen bg-[#fffaf5] px-5 py-8 sm:py-12">
      <div
        className="mx-auto grid max-w-6xl animate-pulse overflow-hidden rounded-[2rem] bg-white shadow-xl lg:grid-cols-[0.8fr_1.2fr]"
        aria-label="Carregando cadastro de startup"
      >
        <div className="min-h-72 bg-[#751118] lg:min-h-[52rem]" />
        <div className="space-y-5 p-8 sm:p-10">
          <div className="h-5 w-32 rounded bg-[#eadbd3]" />
          <div className="h-10 w-64 rounded bg-[#eadbd3]" />
          <div className="h-14 rounded-xl bg-[#f1e8e3]" />
          <div className="h-14 rounded-xl bg-[#f1e8e3]" />
          <div className="h-14 rounded-xl bg-[#f1e8e3]" />
        </div>
        <span className="sr-only">Carregando formulário de cadastro…</span>
      </div>
    </main>
  );
}
