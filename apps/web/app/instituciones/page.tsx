"use client";

import { useEffect, useState, useCallback } from "react";
import { useSorting, SortHeader } from "@/lib/use-sorting";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";
import { PanelDeslizante } from "@/components/panel-deslizante";

interface Institucion {
  id: string;
  nombre: string;
  rnc: string;
  sector: string;
  total_contratos: number;
  monto_total: string;
  num_proveedores: number;
}

function formatearMonto(valor: string | number | null): string {
  if (!valor) return "RD$0";
  const num = typeof valor === "number" ? valor : parseFloat(valor);
  if (isNaN(num)) return "RD$0";
  if (num >= 1_000_000_000) return `RD$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `RD$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `RD$${num.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
  return `RD$${num.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
}

function DetalleInstitucion({ inst }: { inst: Institucion }) {
  const [proveedores, setProveedores] = useState<Array<{
    id: string;
    nombre: string;
    num_contratos: number;
    monto_total: string | number;
  }>>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/proveedores?institucion_id=${inst.id}&limite=10&ordenar=monto_total`)
      .then((r) => r.json())
      .then((data) => setProveedores(data.datos ?? []))
      .finally(() => setCargando(false));
  }, [inst.id]);

  return (
    <div className="p-6 space-y-6">
      {inst.sector && (
        <p className="text-sm text-slate-500 dark:text-zinc-400">{inst.sector}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Contratos</p>
          <p className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{inst.total_contratos?.toLocaleString("es-DO")}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Proveedores</p>
          <p className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{inst.num_proveedores?.toLocaleString("es-DO")}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Monto Total</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatearMonto(inst.monto_total)}</p>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Top Proveedores</h3>
        {cargando ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : proveedores.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-4">Sin proveedores</p>
        ) : (
          proveedores.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-[#13131f] last:border-0"
            >
              <span className="text-sm text-slate-700 dark:text-zinc-300 truncate max-w-[60%]">{p.nombre}</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                {p.monto_total ? formatearMonto(p.monto_total) : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function PaginaInstituciones() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const [instSeleccionada, setInstSeleccionada] = useState<Institucion | null>(null);
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Instituciones</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {total.toLocaleString("es-DO")} instituciones registradas
          </p>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar instituciones..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 w-72 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <BarraFiltrosGlobales
        pagina="instituciones"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      <div className="rounded-xl border border-slate-200 dark:border-[#1a1a2e] overflow-hidden bg-white dark:bg-[#0d0d1a] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-[#1a1a2e] bg-slate-50/80 dark:bg-[#0a0a14]/60">
              <SortHeader columna="nombre" label="Institución" sort={sort} onSort={toggleSort} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider" />
              <SortHeader columna="total_contratos" label="Contratos" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider" />
              <SortHeader columna="monto_total" label="Monto Total" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider" />
              <SortHeader columna="num_proveedores" label="Proveedores" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#13131f]">
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-5 py-4">
                      <div
                        className="h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse"
                        style={{ width: j === 1 ? "60%" : "30%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : instituciones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-500">
                  No se encontraron instituciones
                </td>
              </tr>
            ) : (
              instituciones.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-slate-50 dark:border-[#13131f] hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setInstSeleccionada(i)}
                      className="text-blue-600 dark:text-cyan-400 hover:underline text-left"
                    >
                      {i.nombre}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {i.total_contratos?.toLocaleString("es-DO")}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {formatearMonto(i.monto_total)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {i.num_proveedores?.toLocaleString("es-DO")}
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
            Página {pagina} de {totalPaginas}
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

      <PanelDeslizante
        abierto={instSeleccionada !== null}
        onCerrar={() => setInstSeleccionada(null)}
        titulo={instSeleccionada?.nombre}
      >
        {instSeleccionada && <DetalleInstitucion inst={instSeleccionada} />}
      </PanelDeslizante>
    </div>
  );
}
