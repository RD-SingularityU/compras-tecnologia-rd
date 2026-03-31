"use client";

import { useEffect, useState } from "react";

interface Proveedor {
  id: string;
  nombre: string;
  rnc: string;
  total_contratos: number;
  monto_total: string;
  num_instituciones: number;
}

function formatearMonto(valor: string | null): string {
  if (!valor) return "RD$0";
  const num = parseFloat(valor);
  if (num >= 1_000_000) return `RD$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `RD$${(num / 1_000).toFixed(0)}K`;
  return `RD$${num.toFixed(0)}`;
}

export default function PaginaProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: "20",
      ordenar: "monto_total",
    });
    if (busqueda) params.set("busqueda", busqueda);

    fetch(`/api/proveedores?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProveedores(data.datos);
        setTotal(data.total);
      })
      .finally(() => setCargando(false));
  }, [pagina, busqueda]);

  const totalPaginas = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-zinc-400">
            {total.toLocaleString()} proveedores
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o RNC..."
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
                Proveedor
              </th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                RNC
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                Contratos
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                Monto Total
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                Instituciones
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
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No se encontraron proveedores
                </td>
              </tr>
            ) : (
              proveedores.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/proveedores/${p.id}`}
                      className="text-zinc-200 hover:text-blue-400"
                    >
                      {p.nombre}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {p.rnc || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {p.total_contratos}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">
                    {formatearMonto(p.monto_total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {p.num_instituciones}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
