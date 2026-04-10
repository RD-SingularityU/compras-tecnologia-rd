"use client";

import { useEffect, useState, useCallback } from "react";
import { useSorting, SortHeader } from "@/lib/use-sorting";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";
import { PanelDeslizante } from "@/components/panel-deslizante";

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
  if (isNaN(num)) return "RD$0";
  if (num >= 1_000_000_000) return `RD$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `RD$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `RD$${num.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
  return `RD$${num.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
}

function DetalleProveedor({ proveedor }: { proveedor: Proveedor }) {
  const [contratos, setContratos] = useState<Array<{
    id: string;
    titulo: string;
    valor: number;
    estado: string;
    institucion_nombre: string;
    fecha_firma: string | null;
  }>>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    fetch(`/api/contratos?proveedor_id=${proveedor.id}&limite=10&pagina=1`)
      .then((r) => r.json())
      .then((data) => setContratos(data.datos ?? []))
      .finally(() => setCargando(false));
  }, [proveedor.id]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card: RPE */}
        <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">RPE</p>
          <p className="font-mono text-sm text-slate-700 dark:text-zinc-300 mt-0.5">{proveedor.rnc || "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Contratos</p>
          <p className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">{proveedor.total_contratos?.toLocaleString("es-DO")}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Instituciones</p>
          <p className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{proveedor.num_instituciones?.toLocaleString("es-DO")}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] px-4 py-3">
          <p className="text-xs text-slate-400 dark:text-zinc-500">Monto Total</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatearMonto(proveedor.monto_total)}</p>
        </div>
      </div>

      {/* Últimos contratos */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Últimos contratos</h3>
        {cargando ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : contratos.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-4">Sin contratos</p>
        ) : (
          <div className="space-y-2">
            {contratos.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-100 dark:border-[#1a1a2e] p-3 hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors"
              >
                <p className="text-xs text-slate-700 dark:text-zinc-200 line-clamp-1 font-medium">{c.titulo || "Sin título"}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">{c.institucion_nombre || "—"}</span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    {c.valor ? `RD$${Number(c.valor).toLocaleString("es-DO")}` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaginaProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
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

    fetch(`/api/proveedores?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProveedores(data.datos);
        setTotal(data.total);
      })
      .finally(() => setCargando(false));
  }, [listo, pagina, busqueda, sort.columna, sort.direccion, filtrosGlobales]);

  const totalPaginas = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Proveedores</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {total.toLocaleString("es-DO")} proveedores registrados
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o RPE..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 w-72 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 shadow-sm"
        />
      </div>

      <BarraFiltrosGlobales
        pagina="proveedores"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      <div className="rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-[#1a1a2e] bg-slate-50/80 dark:bg-[#0a0a14]/60">
              <SortHeader columna="nombre" label="Proveedor" sort={sort} onSort={toggleSort} className="text-left px-5 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider" />
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider">RPE</th>
              <SortHeader columna="total_contratos" label="Contratos" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider" />
              <SortHeader columna="monto_total" label="Monto Total" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider" />
              <SortHeader columna="num_instituciones" label="Instituciones" sort={sort} onSort={toggleSort} className="text-right px-5 py-3 text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-[#13131f]">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="px-5 py-4">
                      <div
                        className="h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse"
                        style={{ width: j === 1 ? "60%" : j === 2 ? "40%" : "30%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-500">
                  No se encontraron proveedores
                </td>
              </tr>
            ) : (
              proveedores.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 dark:border-[#13131f] hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setProveedorSeleccionado(p)}
                      className="text-violet-600 dark:text-violet-400 hover:underline text-left"
                    >
                      {p.nombre}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-zinc-400 font-mono text-xs">
                    {p.rnc || "\u2014"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {p.total_contratos.toLocaleString("es-DO")}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {formatearMonto(p.monto_total)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900 dark:text-zinc-100">
                    {p.num_instituciones.toLocaleString("es-DO")}
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
            className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-zinc-900"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500 dark:text-zinc-400">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-zinc-900"
          >
            Siguiente
          </button>
        </div>
      )}

      <PanelDeslizante
        abierto={proveedorSeleccionado !== null}
        onCerrar={() => setProveedorSeleccionado(null)}
        titulo={proveedorSeleccionado?.nombre}
      >
        {proveedorSeleccionado && <DetalleProveedor proveedor={proveedorSeleccionado} />}
      </PanelDeslizante>
    </div>
  );
}
