"use client";

import { useEffect, useState, useCallback } from "react";
import { useSorting, SortHeader } from "@/lib/use-sorting";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface Institucion {
  id: string;
  nombre: string;
  rnc: string;
  sector: string;
  total_contratos: number;
  monto_total: string;
  num_proveedores: number;
}

function formatearMonto(valor: string | null): string {
  if (!valor) return "RD$0";
  const num = parseFloat(valor);
  if (num >= 1_000_000) return `RD$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `RD$${(num / 1_000).toFixed(0)}K`;
  return `RD$${num.toFixed(0)}`;
}

export default function PaginaInstituciones() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const { sort, toggleSort } = useSorting("monto_total");

  const onFiltrosChange = useCallback((filtros: FiltrosGlobales) => {
    setFiltrosGlobales(filtros);
    setPagina(1);
  }, []);

  const onBarraLista = useCallback(() => {
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    setCargando(true);
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: "20",
      ordenar: sort.columna,
      dir: sort.direccion,
    });
    if (busqueda) params.set("busqueda", busqueda);
    for (const [clave, valor] of Object.entries(filtrosGlobales)) {
      if (valor) params.set(clave, valor);
    }

    fetch(`/api/instituciones?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setInstituciones(data.datos);
        setTotal(data.total);
      })
      .finally(() => setCargando(false));
  }, [listo, pagina, busqueda, sort.columna, sort.direccion, filtrosGlobales]);

  const totalPaginas = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instituciones</h1>
          <p className="text-sm text-zinc-400">
            {total.toLocaleString()} instituciones
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar instituciones..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 w-64 focus:outline-none focus:border-blue-500"
        />
      </div>

      <BarraFiltrosGlobales
        pagina="instituciones"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <SortHeader columna="nombre" label="Institucion" sort={sort} onSort={toggleSort} className="text-left" />
              <SortHeader columna="total_contratos" label="Contratos" sort={sort} onSort={toggleSort} className="text-right" />
              <SortHeader columna="monto_total" label="Monto Total" sort={sort} onSort={toggleSort} className="text-right" />
              <SortHeader columna="num_proveedores" label="Proveedores" sort={sort} onSort={toggleSort} className="text-right" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Cargando...
                </td>
              </tr>
            ) : instituciones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No se encontraron instituciones
                </td>
              </tr>
            ) : (
              instituciones.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/instituciones/${i.id}`}
                      className="text-zinc-200 hover:text-blue-400"
                    >
                      {i.nombre}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {i.total_contratos}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">
                    {formatearMonto(i.monto_total)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {i.num_proveedores}
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
