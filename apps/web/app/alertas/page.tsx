"use client";

import { useEffect, useState, useCallback } from "react";
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
  proveedor_unico: "Proveedor Unico",
  concentracion_excesiva: "Concentracion Excesiva",
  compra_directa_alto_valor: "Compra Directa Alto Valor",
  adjudicaciones_rapidas: "Adjudicaciones Rapidas",
};

function colorSeveridad(s: string): string {
  switch (s) {
    case "alta":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "media":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default:
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  }
}

export default function PaginaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);

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
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroSeveridad) params.set("severidad", filtroSeveridad);
    for (const [clave, valor] of Object.entries(filtrosGlobales)) {
      if (valor) params.set(clave, valor);
    }

    fetch(`/api/alertas?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAlertas(data.datos ?? []);
        setResumen(data.resumen);
      })
      .finally(() => setCargando(false));
  }, [listo, filtroTipo, filtroSeveridad, filtrosGlobales]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Red Flags</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Alertas automaticas detectadas en contrataciones publicas
        </p>
      </div>

      {/* Filtros globales */}
      <BarraFiltrosGlobales
        pagina="alertas"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase">Total</p>
            <p className="text-2xl font-bold font-mono">{resumen.total}</p>
          </div>
          <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
            <p className="text-xs text-red-400 uppercase">Alta</p>
            <p className="text-2xl font-bold font-mono text-red-400">
              {resumen.alta}
            </p>
          </div>
          <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
            <p className="text-xs text-yellow-400 uppercase">Media</p>
            <p className="text-2xl font-bold font-mono text-yellow-400">
              {resumen.media}
            </p>
          </div>
          <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-4">
            <p className="text-xs text-blue-400 uppercase">Baja</p>
            <p className="text-2xl font-bold font-mono text-blue-400">
              {resumen.baja}
            </p>
          </div>
        </div>
      )}

      {/* Filtros propios */}
      <div className="flex gap-3">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filtroSeveridad}
          onChange={(e) => setFiltroSeveridad(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
        >
          <option value="">Todas las severidades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {/* Lista de alertas */}
      <div className="space-y-3">
        {cargando ? (
          <p className="text-zinc-500 text-center py-8">Cargando...</p>
        ) : alertas.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            No hay alertas. Ejecuta la deteccion de red flags primero.
          </p>
        ) : (
          alertas.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colorSeveridad(a.severidad)}`}
                    >
                      {a.severidad}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {TIPOS_LABEL[a.tipo] ?? a.tipo}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200">{a.descripcion}</p>
                </div>
                <a
                  href={`/${a.entidad_tipo === "proveedor" ? "proveedores" : a.entidad_tipo === "institucion" ? "instituciones" : "contratos"}/${a.entidad_id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 shrink-0 ml-4"
                >
                  Ver detalle &rarr;
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
