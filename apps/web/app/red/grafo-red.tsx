"use client";

import { useEffect, useRef, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

interface NodoGrafo {
  id: string;
  tipo: string;
  nombre: string;
}

interface AristaGrafo {
  origen: string;
  destino: string;
  peso: number;
  numContratos: number;
}

interface DatosGrafo {
  nodos: NodoGrafo[];
  aristas: AristaGrafo[];
}

export function GrafoRed({ filtrosGlobales = {} }: { filtrosGlobales?: FiltrosGlobales }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<NodoGrafo | null>(
    null
  );
  const [minContratos, setMinContratos] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const controller = new AbortController();

    async function cargarGrafo() {
      setCargando(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limite: "500",
          min_contratos: String(minContratos),
        });
        for (const [clave, valor] of Object.entries(filtrosGlobales)) {
          if (valor) params.set(clave, valor);
        }
        const resp = await fetch(
          `/api/grafo?${params}`,
          { signal: controller.signal }
        );
        if (!resp.ok) throw new Error("Error cargando grafo");
        const datos: DatosGrafo = await resp.json();

        if (datos.nodos.length === 0) {
          setError("No hay datos de grafo. Ejecuta la ingesta primero.");
          setCargando(false);
          return;
        }

        // Limpiar instancia anterior
        if (sigmaRef.current) {
          sigmaRef.current.kill();
          sigmaRef.current = null;
        }

        const graph = new Graph();

        // Agregar nodos
        for (const nodo of datos.nodos) {
          const esInstitucion = nodo.tipo === "institucion";
          graph.addNode(nodo.id, {
            label: nodo.nombre,
            size: esInstitucion ? 8 : 5,
            color: esInstitucion ? "#3b82f6" : "#22c55e",
            x: Math.random() * 100,
            y: Math.random() * 100,
            tipo: nodo.tipo,
          });
        }

        // Agregar aristas
        for (const arista of datos.aristas) {
          if (graph.hasNode(arista.origen) && graph.hasNode(arista.destino)) {
            const key = `${arista.origen}-${arista.destino}`;
            if (!graph.hasEdge(key)) {
              graph.addEdgeWithKey(key, arista.origen, arista.destino, {
                size: Math.min(Math.max(arista.numContratos * 0.5, 0.5), 5),
                color: "#374151",
              });
            }
          }
        }

        // Layout ForceAtlas2
        forceAtlas2.assign(graph, {
          iterations: 100,
          settings: {
            gravity: 1,
            scalingRatio: 10,
            barnesHutOptimize: true,
          },
        });

        // Renderizar con Sigma
        const sigma = new Sigma(graph, containerRef.current!, {
          renderEdgeLabels: false,
          defaultEdgeColor: "#374151",
          labelColor: { color: "#d4d4d8" },
          labelFont: "Geist Sans, sans-serif",
          labelSize: 11,
          labelRenderedSizeThreshold: 6,
        });

        sigma.on("clickNode", ({ node }) => {
          const attrs = graph.getNodeAttributes(node);
          setNodoSeleccionado({
            id: node,
            tipo: attrs.tipo as string,
            nombre: attrs.label as string,
          });
        });

        sigma.on("clickStage", () => {
          setNodoSeleccionado(null);
        });

        sigmaRef.current = sigma;
        setCargando(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
          setCargando(false);
        }
      }
    }

    cargarGrafo();

    return () => {
      controller.abort();
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
    };
  }, [minContratos, filtrosGlobales]);

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-zinc-400">
          Min. contratos:
          <input
            type="range"
            min={1}
            max={20}
            value={minContratos}
            onChange={(e) => setMinContratos(parseInt(e.target.value))}
            className="ml-2 w-32 accent-blue-500"
          />
          <span className="ml-1 font-mono text-zinc-200">{minContratos}</span>
        </label>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Instituciones
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Proveedores
          </span>
        </div>
      </div>

      {/* Grafo */}
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div ref={containerRef} className="w-full h-[600px]" />

        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <p className="text-zinc-400 text-sm">Cargando grafo...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Panel de detalle del nodo seleccionado */}
        {nodoSeleccionado && (
          <div className="absolute top-4 right-4 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
            <p className="text-xs text-zinc-500 uppercase">
              {nodoSeleccionado.tipo}
            </p>
            <p className="font-medium mt-1">{nodoSeleccionado.nombre}</p>
            <a
              href={`/${nodoSeleccionado.tipo === "institucion" ? "instituciones" : "proveedores"}/${nodoSeleccionado.id}`}
              className="mt-3 block text-sm text-blue-400 hover:text-blue-300"
            >
              Ver detalle →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
