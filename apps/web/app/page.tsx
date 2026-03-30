export default function PaginaInicio() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-2xl px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Compras Tecnologia RD
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Visualizacion de contrataciones publicas de tecnologia en Republica
          Dominicana. Explora la relacion entre contratos gubernamentales y
          proveedores.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/contratos"
            className="rounded-lg bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            Explorar contratos
          </a>
          <a
            href="/red"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Ver red de proveedores
          </a>
        </div>
      </main>
    </div>
  );
}
