"use client";

import { useEffect, useState } from "react";

interface Contrato {
  id: string;
  ocid: string;
  titulo: string;
  descripcion: string;
  estado: string;
  valor: string;
  moneda: string;
  fecha_firma: string;
  institucion_nombre: string;
  institucion_id: string;
  proveedores: Array<{ id: string; nombre: string; rnc: string }>;
}

function formatearMonto(valor: string | null): string {
  if (!valor) return "—";
  const num = parseFloat(valor);
  return `RD$${num.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default function PaginaContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: "20",
    });
    if (busqueda) params.set("busqueda", busqueda);

    fetch(`/api/contratos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContratos(data.datos);
        setTotal(data.total);
      })
      .finally(() => setCargando(false));
  }, [pagina, busqueda]);

  const totalPaginas = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} contratos</p>
        </div>
        <input
          type="text"
          placeholder="Buscar contratos..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 w-64 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Titulo
              </th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Institucion
              </th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Proveedor
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                Valor
              </th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Cargando...
                </td>
              </tr>
            ) : contratos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No se encontraron contratos
                </td>
              </tr>
            ) : (
              contratos.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/contratos/${c.id}`}
                      className="text-zinc-200 hover:text-blue-400"
                    >
                      {c.titulo || c.ocid || "Sin titulo"}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.institucion_nombre || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.proveedores?.length > 0
                      ? c.proveedores.map((p) => p.nombre).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">
                    {formatearMonto(c.valor)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {c.fecha_firma
                      ? new Date(c.fecha_firma).toLocaleDateString("es-DO")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="rounded px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-400">
            Pagina {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className="rounded px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
