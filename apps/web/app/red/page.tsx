"use client";

import dynamic from "next/dynamic";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";
import { useState, useCallback } from "react";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

const GrafoRed = dynamic(() => import("./grafo-red").then((m) => m.GrafoRed), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 h-[600px] flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Cargando visualizacion...</p>
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Red de Contrataciones</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Visualizacion de relaciones entre instituciones y proveedores. Los
          nodos azules son instituciones, los verdes son proveedores. El grosor
          de las lineas representa el volumen de contratos.
        </p>
      </div>
      <BarraFiltrosGlobales
        pagina="red"
        onFiltrosChange={onFiltrosChange}
        onListo={onBarraLista}
      />
      {listo && <GrafoRed filtrosGlobales={filtrosGlobales} />}
    </div>
  );
}
