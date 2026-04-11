"use client";

import dynamic from "next/dynamic";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import { useState, useCallback } from "react";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

const GrafoRed = dynamic(() => import("./grafo-red").then((m) => m.GrafoRed), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-[#05050a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-slate-400 dark:text-zinc-500 text-sm">Cargando visualización...</p>
      </div>
    </div>
  ),
});

export default function PaginaRed() {
  const [filtrosGlobales, setFiltrosGlobales] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);

  const onFiltrosChange = useCallback((filtros: FiltrosGlobales) => {
    setFiltrosGlobales(filtros);
  }, []);

  const onBarraLista = useCallback(() => {
    setListo(true);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Encabezado — tamaño fijo */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Red de Contrataciones
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          Relaciones entre instituciones públicas y sus proveedores tecnológicos.
          Haz clic en cualquier nodo para ver el detalle.
        </p>
      </div>

      {/* Filtros globales — tamaño fijo */}
      <div className="flex-shrink-0">
        <BarraFiltrosGlobales
          pagina="red"
          onFiltrosChange={onFiltrosChange}
          onListo={onBarraLista}
        />
      </div>

      {/* Grafo — ocupa todo el espacio restante */}
      {listo ? (
        <div className="flex-1 min-h-0">
          <GrafoRed filtrosGlobales={filtrosGlobales} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-[#05050a] flex items-center justify-center">
          <p className="text-slate-400 dark:text-zinc-500 text-sm">Preparando filtros...</p>
        </div>
      )}
    </div>
  );
}
