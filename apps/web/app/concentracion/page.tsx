"use client";

import { useEffect, useState, useCallback } from "react";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import { PanelDeslizante } from "@/components/panel-deslizante";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface DatosHhi {
  institucion_id: string;
  institucion_nombre: string;
  hhi: number;
  num_proveedores: number;
  porcentaje_dominante: number;
  proveedor_dominante_nombre: string;
  proveedor_dominante_id: string;
  nivel: string;
}

function colorNivel(nivel: string): string {
  switch (nivel) {
    case "concentrado":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "moderado":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default:
      return "text-green-400 bg-green-400/10 border-green-400/20";
  }
}

// ── Componente detalle proveedor en el panel deslizante ───────────────────────

function DetalleProveedorHHI({ proveedorId }: { proveedorId: string }) {
  const [contratos, setContratos] = useState<
    Array<{ id: string; titulo: string; valor: number; institucion_nombre: string }>
  >([]);
  const [cargandoPanel, setCargandoPanel] = useState(true);

  useEffect(() => {
    setCargandoPanel(true);
    fetch(`/api/contratos?proveedor_id=${proveedorId}&limite=8&pagina=1`)
      .then((r) => r.json())
      .then((data) => setContratos(data.datos ?? []))
      .finally(() => setCargandoPanel(false));
  }, [proveedorId]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Últimos contratos
        </h3>
        {cargandoPanel ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500">Cargando...</p>
        ) : contratos.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500">Sin contratos registrados.</p>
        ) : (
          contratos.map((c) => (
            <div
              key={c.id}
              className="py-2 border-b border-slate-50 dark:border-[#13131f] last:border-0"
            >
              <p className="text-xs text-slate-700 dark:text-zinc-300 line-clamp-1">
                {c.titulo || "Sin título"}
              </p>
              <div className="flex justify-between mt-0.5">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  {c.institucion_nombre || "—"}
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {c.valor ? `RD$${Number(c.valor).toLocaleString("es-DO")}` : "—"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PaginaConcentracion() {
  const [datos, setDatos] = useState<DatosHhi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);
  const [proveedorPanel, setProveedorPanel] = useState<{
    id: string | null;
    nombre: string;
  } | null>(null);

  const onFiltrosChange = useCallback((filtros: FiltrosGlobales) => {
    setFiltrosGlobales(filtros);
  }, []);

  const onBarraLista = useCallback(() => {
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    setCargando(true);
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtrosGlobales)) {
      if (valor) params.set(clave, valor);
    }

    fetch(`/api/concentracion?${params}`)
      .then((r) => r.json())
      .then((data) => setDatos(data.datos ?? []))
      .finally(() => setCargando(false));
  }, [listo, filtrosGlobales]);

  const concentrados = datos.filter((d) => d.nivel === "concentrado").length;
  const moderados = datos.filter((d) => d.nivel === "moderado").length;
  const competitivos = datos.filter((d) => d.nivel === "competitivo").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">
          Analisis de Concentracion
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          Indice Herfindahl-Hirschman (HHI) por institucion. HHI &gt; 2500 =
          altamente concentrado, 1500-2500 = moderado, &lt; 1500 = competitivo.
        </p>
      </div>

      <BarraFiltrosGlobales
        pagina="concentracion"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4 shadow-sm">
          <p className="text-xs text-red-400 uppercase">Concentrado</p>
          <p className="text-2xl font-bold font-mono text-red-400">
            {concentrados}
          </p>
        </div>
        <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4 shadow-sm">
          <p className="text-xs text-yellow-400 uppercase">Moderado</p>
          <p className="text-2xl font-bold font-mono text-yellow-400">
            {moderados}
          </p>
        </div>
        <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-4 shadow-sm">
          <p className="text-xs text-green-400 uppercase">Competitivo</p>
          <p className="text-2xl font-bold font-mono text-green-400">
            {competitivos}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1a1a2e] overflow-hidden bg-white dark:bg-[#0d0d1a] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0a0a14] border-b border-slate-200 dark:border-[#1a1a2e]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Institucion
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                HHI
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Nivel
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Proveedores
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Proveedor Dominante
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                % Dominante
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-500">
                  Cargando...
                </td>
              </tr>
            ) : datos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500 dark:text-zinc-500">
                  No hay datos HHI. Ejecuta el analisis primero.
                </td>
              </tr>
            ) : (
              datos.map((d) => (
                <tr
                  key={d.institucion_id}
                  className="border-b border-slate-50 dark:border-[#13131f] hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors"
                >
                  <td className="px-5 py-3">
                    <a
                      href={`/instituciones/${d.institucion_id}`}
                      className="text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {d.institucion_nombre}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700 dark:text-zinc-200">
                    {d.hhi?.toLocaleString("es-DO", { maximumFractionDigits: 0 }) ?? "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colorNivel(d.nivel)}`}
                    >
                      {d.nivel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700 dark:text-zinc-200">
                    {d.num_proveedores?.toLocaleString("es-DO")}
                  </td>
                  <td className="px-5 py-3">
                    {d.proveedor_dominante_nombre ? (
                      <button
                        onClick={() =>
                          setProveedorPanel({
                            id: d.proveedor_dominante_id,
                            nombre: d.proveedor_dominante_nombre,
                          })
                        }
                        className="text-violet-600 dark:text-violet-400 hover:underline text-left"
                      >
                        {d.proveedor_dominante_nombre}
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-slate-700 dark:text-zinc-200">
                    {d.porcentaje_dominante?.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Panel deslizante de proveedor dominante */}
      <PanelDeslizante
        abierto={proveedorPanel !== null}
        onCerrar={() => setProveedorPanel(null)}
        titulo={proveedorPanel?.nombre}
      >
        {proveedorPanel?.id && (
          <DetalleProveedorHHI proveedorId={proveedorPanel.id} />
        )}
      </PanelDeslizante>
    </div>
  );
}
