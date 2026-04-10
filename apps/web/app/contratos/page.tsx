"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSorting, SortHeader } from "@/lib/use-sorting";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface Contrato {
  id: string;
  ocid: string;
  titulo: string;
  descripcion: string;
  estado: string;
  valor: string;
  moneda: string;
  fecha_firma: string | null;
  periodo_inicio: string | null;
  institucion_nombre: string;
  institucion_id: string;
  proveedores: Array<{ id: string; nombre: string; rnc: string }>;
}

function formatearMonto(valor: string | null): string {
  if (!valor) return "\u2014";
  const num = parseFloat(valor);
  return `RD$${num.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default function PaginaContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const { sort, toggleSort } = useSorting("fecha_firma");

  // Leer proveedor_id de URL al montar
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setProveedorId(sp.get("proveedor_id") ?? "");
    setBusqueda(sp.get("busqueda") ?? "");
  }, []);

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
    if (proveedorId) params.set("proveedor_id", proveedorId);
    // Agregar filtros globales
    for (const [clave, valor] of Object.entries(filtrosGlobales)) {
      if (valor) params.set(clave, valor);
    }

    fetch(`/api/contratos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContratos(data.datos);
        setTotal(data.total);
        if (proveedorId && data.datos.length > 0 && !proveedorNombre) {
          const prov = data.datos[0]?.proveedores?.find(
            (p: { id: string }) => p.id === proveedorId
          );
          if (prov) setProveedorNombre(prov.nombre);
        }
      })
      .finally(() => setCargando(false));
  }, [listo, pagina, busqueda, proveedorId, sort.columna, sort.direccion, filtrosGlobales]);

  const totalPaginas = Math.ceil(total / 20);

  function limpiarProveedor() {
    setProveedorId("");
    setProveedorNombre("");
    setPagina(1);
  }

  function filtrarPorProveedor(id: string, nombre: string) {
    setProveedorId(id);
    setProveedorNombre(nombre);
    setPagina(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Contratos</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
              {total.toLocaleString("es-DO")}
            </span>
            <span className="text-sm text-slate-500 dark:text-zinc-400">contratos registrados</span>
          </div>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por titulo o descripcion..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 w-72 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-sm"
          />
        </div>
      </div>

      {/* Filtros globales */}
      <BarraFiltrosGlobales
        pagina="contratos"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      {/* Filtro de proveedor (propio de esta pagina) */}
      {proveedorId && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Filtro adicional:</span>
          <button
            onClick={limpiarProveedor}
            className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-400 hover:bg-blue-400/20"
          >
            Proveedor: {proveedorNombre || proveedorId.slice(0, 8)}
            <span className="ml-1">&times;</span>
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-[#1a1a2e] overflow-hidden bg-white dark:bg-[#0d0d1a] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0a0a14] border-b border-slate-200 dark:border-[#1a1a2e]">
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-zinc-500 text-center w-10">#</th>
              <SortHeader columna="titulo" label="Titulo" sort={sort} onSort={toggleSort} className="text-left" />
              <SortHeader columna="institucion" label="Institucion" sort={sort} onSort={toggleSort} className="text-left" />
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-left">Proveedor</th>
              <SortHeader columna="valor" label="Valor" sort={sort} onSort={toggleSort} className="text-right" />
              <SortHeader columna="fecha_firma" label="Fecha" sort={sort} onSort={toggleSort} className="text-left" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#13131f]">
                  <td className="px-4 py-3"><div className="h-4 w-6 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse w-3/4" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse w-2/3" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse w-1/2" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse w-1/3" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse w-1/4" /></td>
                </tr>
              ))
            ) : contratos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-zinc-500">
                  No se encontraron contratos
                </td>
              </tr>
            ) : (
              contratos.map((c, index) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 dark:border-[#13131f] hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors"
                >
                  <td className="px-4 py-3 text-center text-xs font-mono text-slate-400 dark:text-zinc-500">
                    {(pagina - 1) * 20 + index + 1}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-slate-800 dark:text-zinc-200 font-medium line-clamp-1">
                      {c.titulo || c.ocid || "Sin titulo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.institucion_id ? (
                      <Link
                        href={`/instituciones/${c.institucion_id}`}
                        className="text-blue-600 dark:text-cyan-400 hover:underline text-xs"
                      >
                        {c.institucion_nombre || "\u2014"}
                      </Link>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.proveedores?.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {c.proveedores.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => filtrarPorProveedor(p.id, p.nombre)}
                            className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 text-left text-xs"
                            title="Filtrar por este proveedor"
                          >
                            {p.nombre}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatearMonto(c.valor)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 font-mono text-xs">
                    {(c.fecha_firma || c.periodo_inicio)
                      ? new Date((c.fecha_firma || c.periodo_inicio)!).toLocaleDateString("es-DO")
                      : "\u2014"}
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
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500 dark:text-zinc-400">
            Pagina {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
