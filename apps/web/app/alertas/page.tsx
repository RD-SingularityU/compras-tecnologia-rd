"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface Alerta {
  id: string;
  tipo: string;
  severidad: string;
  descripcion: string;
  entidad_tipo: string;
  entidad_id: string;
  datos: Record<string, unknown>;
  detectado_en: string;
}

interface Resumen {
  alta: number;
  media: number;
  baja: number;
  total: number;
}

const TIPOS_LABEL: Record<string, string> = {
  proveedor_unico: "Proveedor Único",
  concentracion_excesiva: "Concentración Excesiva",
  compra_directa_alto_valor: "Compra Directa Alto Valor",
  adjudicaciones_rapidas: "Adjudicaciones Rápidas",
};

const LIMITE = 20;

// ── Helpers de color ─────────────────────────────────────────────────────────

function clasesBadge(s: string) {
  switch (s?.toLowerCase()) {
    case "alta": return "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20";
    case "media": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    default: return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
  }
}

function clasesBordeIzq(s: string) {
  switch (s?.toLowerCase()) {
    case "alta": return "border-l-red-500";
    case "media": return "border-l-amber-500";
    default: return "border-l-blue-500";
  }
}

function urlEntidad(tipo: string, id: string): string | null {
  if (!id || id === "00000000-0000-0000-0000-000000000000") return null;
  if (tipo === "proveedor") return `/proveedores/${id}`;
  if (tipo === "institucion") return `/instituciones/${id}`;
  return null;
}

function labelEntidad(tipo: string): string {
  if (tipo === "proveedor") return "Ver Proveedor";
  if (tipo === "institucion") return "Ver Institución";
  return "Ver Entidad";
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PaginaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSeveridad, setFiltroSeveridad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Alerta | null>(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  const onFiltrosChange = useCallback((f: FiltrosGlobales) => {
    setFiltrosGlobales(f);
    setPagina(1);
  }, []);

  const onBarraLista = useCallback(() => setListo(true), []);

  useEffect(() => {
    if (!listo) return;
    setCargando(true);
    setSeleccionada(null);
    const params = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE) });
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroSeveridad) params.set("severidad", filtroSeveridad);
    for (const [k, v] of Object.entries(filtrosGlobales)) {
      if (v) params.set(k, v);
    }
    fetch(`/api/alertas?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAlertas(data.datos ?? []);
        setResumen(data.resumen);
        setTotal(data.total ?? data.datos?.length ?? 0);
      })
      .finally(() => setCargando(false));
  }, [listo, pagina, filtroTipo, filtroSeveridad, filtrosGlobales]);

  const totalPaginas = Math.ceil(total / LIMITE);

  return (
    <div className="space-y-5">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Red Flags
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          Alertas automáticas detectadas en contrataciones públicas
        </p>
      </div>

      <BarraFiltrosGlobales pagina="alertas" onFiltrosChange={onFiltrosChange} onListo={onBarraLista} />

      {/* ── KPI cards ──────────────────────────────────────────────── */}
      {resumen && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", valor: resumen.total, clases: "border-slate-200 dark:border-[#1a1a2e] text-slate-700 dark:text-zinc-300" },
            { label: "Alta", valor: resumen.alta, clases: "border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400" },
            { label: "Media", valor: resumen.media, clases: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400" },
            { label: "Baja", valor: resumen.baja, clases: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400" },
          ].map(({ label, valor, clases }) => (
            <div key={label} className={`rounded-xl border p-4 bg-white dark:bg-[#0d0d1a] shadow-sm ${clases}`}>
              <p className="text-xs font-medium uppercase tracking-widest mb-1 opacity-70">{label}</p>
              <p className="text-3xl font-bold font-mono">{valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtros propios ─────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filtroTipo}
          onChange={(e) => { setFiltroTipo(e.target.value); setPagina(1); }}
          className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-sm"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filtroSeveridad}
          onChange={(e) => { setFiltroSeveridad(e.target.value); setPagina(1); }}
          className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-sm"
        >
          <option value="">Todas las severidades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {/* ── Layout Outlook ──────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[500px]">

        {/* Lista izquierda */}
        <div className="w-2/5 flex flex-col rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1a1a2e] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              {total.toLocaleString("es-DO")} alertas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-[#13131f]">
            {cargando ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 animate-pulse">
                  <div className="flex gap-2 mb-2">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                    <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-zinc-800/60 rounded w-full mb-1" />
                  <div className="h-3 bg-slate-100 dark:bg-zinc-800/60 rounded w-3/4" />
                </div>
              ))
            ) : alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-zinc-500">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                <p className="mt-2 text-sm">Sin alertas detectadas</p>
              </div>
            ) : (
              alertas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSeleccionada(a)}
                  className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${clasesBordeIzq(a.severidad)} ${
                    seleccionada?.id === a.id
                      ? "bg-slate-100 dark:bg-[#13131f]"
                      : "hover:bg-slate-50 dark:hover:bg-[#13131f]/60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${clasesBadge(a.severidad)}`}>
                      {a.severidad}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize truncate">
                      {TIPOS_LABEL[a.tipo] ?? a.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2">
                    {a.descripcion}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Paginacion */}
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-[#1a1a2e] flex items-center justify-between">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400 dark:text-zinc-500">
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="rounded-lg px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {/* Panel derecho — detalle */}
        <div className="flex-1 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] overflow-hidden shadow-sm">
          {seleccionada ? (
            <div className="h-full flex flex-col">
              {/* Header del detalle */}
              <div className={`px-6 py-5 border-b border-slate-100 dark:border-[#1a1a2e] border-l-4 ${clasesBordeIzq(seleccionada.severidad)}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${clasesBadge(seleccionada.severidad)}`}>
                    {seleccionada.severidad}
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                    {TIPOS_LABEL[seleccionada.tipo] ?? seleccionada.tipo}
                  </span>
                </div>
                {seleccionada.detectado_en && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Detectado: {new Date(seleccionada.detectado_en).toLocaleDateString("es-DO", {
                      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                )}
              </div>

              {/* Cuerpo del detalle */}
              <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Descripción</h3>
                  <p className="text-sm text-slate-700 dark:text-zinc-200 leading-relaxed">
                    {seleccionada.descripcion}
                  </p>
                </div>

                {seleccionada.datos && Object.keys(seleccionada.datos).length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Datos adicionales</h3>
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a14] border border-slate-200 dark:border-[#1a1a2e] p-4 space-y-2">
                      {Object.entries(seleccionada.datos).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 text-sm">
                          <span className="text-slate-500 dark:text-zinc-500 capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-mono text-slate-700 dark:text-zinc-300 text-right">
                            {typeof v === "number" ? v.toLocaleString("es-DO") : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer con boton de accion */}
              {urlEntidad(seleccionada.entidad_tipo, seleccionada.entidad_id) && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-[#1a1a2e]">
                  <Link
                    href={urlEntidad(seleccionada.entidad_tipo, seleccionada.entidad_id)!}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-cyan-500 hover:bg-blue-700 dark:hover:bg-cyan-600 text-white px-4 py-2 text-sm font-medium transition-colors shadow-sm"
                  >
                    {labelEntidad(seleccionada.entidad_tipo)}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Placeholder cuando nada esta seleccionado */
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-zinc-600">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <p className="mt-4 text-sm font-medium">Selecciona una alerta</p>
              <p className="mt-1 text-xs">para ver los detalles aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
