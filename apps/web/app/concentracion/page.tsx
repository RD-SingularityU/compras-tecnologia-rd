"use client";

import { useEffect, useState, useCallback } from "react";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface DatosHhi {
  institucion_id: string;
  institucion_nombre: string;
  hhi: number;
  num_proveedores: number;
  porcentaje_dominante: number;
  proveedor_dominante_nombre: string;
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

export default function PaginaConcentracion() {
  const [datos, setDatos] = useState<DatosHhi[]>([]);
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
        <h1 className="text-2xl font-bold">Analisis de Concentracion</h1>
        <p className="text-sm text-zinc-400 mt-1">
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
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
          <p className="text-xs text-red-400 uppercase">Concentrado</p>
          <p className="text-2xl font-bold font-mono text-red-400">
            {concentrados}
          </p>
        </div>
        <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-4">
          <p className="text-xs text-yellow-400 uppercase">Moderado</p>
          <p className="text-2xl font-bold font-mono text-yellow-400">
            {moderados}
          </p>
        </div>
        <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-4">
          <p className="text-xs text-green-400 uppercase">Competitivo</p>
          <p className="text-2xl font-bold font-mono text-green-400">
            {competitivos}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Institucion
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                HHI
              </th>
              <th className="text-center px-4 py-3 text-zinc-400 font-medium">
                Nivel
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                Proveedores
              </th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">
                Proveedor Dominante
              </th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">
                % Dominante
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Cargando...
                </td>
              </tr>
            ) : datos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No hay datos HHI. Ejecuta el analisis primero.
                </td>
              </tr>
            ) : (
              datos.map((d) => (
                <tr
                  key={d.institucion_id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/instituciones/${d.institucion_id}`}
                      className="text-zinc-200 hover:text-blue-400"
                    >
                      {d.institucion_nombre}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {d.hhi?.toFixed(0) ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colorNivel(d.nivel)}`}
                    >
                      {d.nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {d.num_proveedores}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {d.proveedor_dominante_nombre ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {d.porcentaje_dominante?.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
