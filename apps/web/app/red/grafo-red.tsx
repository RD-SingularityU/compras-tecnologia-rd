"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { PanelDeslizante } from "@/components/panel-deslizante";
import type { FiltrosGlobales } from "@/lib/filtros-globales";

/* ─── Tipos ──────────────────────────────────────────────── */
interface NodoGrafo {
  id: string;
  tipo: "institucion" | "proveedor";
  nombre: string;
  numContratos?: number;
}

interface AristaGrafo {
  origen: string;      // institucion id
  destino: string;     // proveedor id
  numContratos: number;
}

interface DatosGrafo {
  nodos: NodoGrafo[];
  aristas: AristaGrafo[];
}

interface ContratoPanel {
  id: string;
  titulo: string | null;
  valor: string | null;
  moneda: string | null;
  fecha_firma: string | null;
  institucion_nombre: string | null;
  proveedores: Array<{ id: string; nombre: string }>;
}

/* ─── Constantes de layout ───────────────────────────────── */
const ROW_H = 34;       // px por fila
const PAD_V = 28;       // padding vertical del SVG
const PAD_NAMES = 230;  // espacio para etiquetas a cada lado
const DOT_R = 4;        // radio de los puntos
const MAX_INST = 30;    // máx instituciones visibles
const MAX_PROV = 40;    // máx proveedores visibles

const INST_COLOR = "#22d3ee";   // cyan-400
const PROV_COLOR = "#34d399";   // emerald-400
const GRAD_ID = "bezierGrad";

/* ─── Componente principal ───────────────────────────────── */
export function GrafoRed({ filtrosGlobales = {} }: { filtrosGlobales?: FiltrosGlobales }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(900);
  const [datos, setDatos] = useState<DatosGrafo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minContratos, setMinContratos] = useState(2);
  const [hoveredInstId, setHoveredInstId] = useState<string | null>(null);
  const [hoveredProvId, setHoveredProvId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; texto: string } | null>(null);

  // Panel deslizante
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelTitulo, setPanelTitulo] = useState("");
  const [panelContratos, setPanelContratos] = useState<ContratoPanel[]>([]);
  const [panelCargando, setPanelCargando] = useState(false);

  /* ── ResizeObserver para ancho responsivo ── */
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setSvgWidth(w);
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Fetch datos ── */
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limite: "600", min_contratos: String(minContratos) });
        for (const [k, v] of Object.entries(filtrosGlobales)) {
          if (v) params.set(k, v);
        }
        const resp = await fetch(`/api/grafo?${params}`, { signal: controller.signal });
        if (!resp.ok) throw new Error("Error cargando datos de red");
        const json: DatosGrafo = await resp.json();
        setDatos(json);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
    return () => controller.abort();
  }, [minContratos, filtrosGlobales]);

  /* ── Layout bipartito ── */
  const { instituciones, proveedores, aristas, svgHeight } = useMemo(() => {
    if (!datos) return { instituciones: [], proveedores: [], aristas: [], svgHeight: 400 };

    // Calcular numContratos por nodo a partir de las aristas
    const conteoNodo = new Map<string, number>();
    for (const a of datos.aristas) {
      conteoNodo.set(a.origen, (conteoNodo.get(a.origen) ?? 0) + a.numContratos);
      conteoNodo.set(a.destino, (conteoNodo.get(a.destino) ?? 0) + a.numContratos);
    }

    const instNodos = datos.nodos
      .filter((n) => n.tipo === "institucion")
      .sort((a, b) => (conteoNodo.get(b.id) ?? 0) - (conteoNodo.get(a.id) ?? 0))
      .slice(0, MAX_INST);

    const provNodos = datos.nodos
      .filter((n) => n.tipo === "proveedor")
      .sort((a, b) => (conteoNodo.get(b.id) ?? 0) - (conteoNodo.get(a.id) ?? 0))
      .slice(0, MAX_PROV);

    const instSet = new Set(instNodos.map((n) => n.id));
    const provSet = new Set(provNodos.map((n) => n.id));

    const aristasVisibles = datos.aristas.filter(
      (a) => instSet.has(a.origen) && provSet.has(a.destino)
    );

    const altura = Math.max(
      instNodos.length * ROW_H + PAD_V * 2,
      provNodos.length * ROW_H + PAD_V * 2,
      300
    );

    return { instituciones: instNodos, proveedores: provNodos, aristas: aristasVisibles, svgHeight: altura };
  }, [datos]);

  /* ── Posiciones Y ── */
  const yInst = useCallback(
    (i: number) => PAD_V + i * ROW_H + ROW_H / 2,
    []
  );
  const yProv = useCallback(
    (i: number, total: number) => {
      // Centrar verticalmente los proveedores respecto al SVG
      const totalH = total * ROW_H;
      const startY = Math.max(PAD_V, (svgHeight - totalH) / 2);
      return startY + i * ROW_H + ROW_H / 2;
    },
    [svgHeight]
  );

  /* ── Coordenadas X ── */
  const dotXLeft = PAD_NAMES;
  const dotXRight = svgWidth - PAD_NAMES;
  const midX = svgWidth / 2;

  /* ── Helpers hover ── */
  const isHighlighted = useCallback(
    (arista: AristaGrafo) => {
      if (!hoveredInstId && !hoveredProvId) return true;
      if (hoveredInstId && arista.origen === hoveredInstId) return true;
      if (hoveredProvId && arista.destino === hoveredProvId) return true;
      return false;
    },
    [hoveredInstId, hoveredProvId]
  );

  /* ── Abrir panel ── */
  const abrirPanel = useCallback(async (tipo: "institucion" | "proveedor", id: string, nombre: string) => {
    setPanelTitulo(nombre);
    setPanelAbierto(true);
    setPanelCargando(true);
    setPanelContratos([]);
    try {
      const param = tipo === "institucion" ? "institucion_id" : "proveedor_id";
      const resp = await fetch(`/api/contratos?${param}=${id}&limite=10`);
      if (resp.ok) {
        const json = await resp.json();
        setPanelContratos(json.datos ?? json.contratos ?? json ?? []);
      }
    } catch {
      // silencioso
    } finally {
      setPanelCargando(false);
    }
  }, []);

  /* ── Mapa índice para buscar posición Y ── */
  const instIndex = useMemo(() => new Map(instituciones.map((n, i) => [n.id, i])), [instituciones]);
  const provIndex = useMemo(() => new Map(proveedores.map((n, i) => [n.id, i])), [proveedores]);

  /* ────────────────────────── RENDER ────────────────────────── */
  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controles */}
      <div className="flex-shrink-0 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300">
          <span>Mín. contratos:</span>
          <input
            type="range"
            min={1}
            max={30}
            value={minContratos}
            onChange={(e) => setMinContratos(parseInt(e.target.value))}
            className="w-28 accent-cyan-500"
          />
          <span className="font-mono text-slate-700 dark:text-zinc-200 w-4">{minContratos}</span>
        </label>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-500 rounded-lg border border-slate-200 dark:border-[#1a1a2e] bg-white/80 dark:bg-[#0d0d1a]/80 px-3 py-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: INST_COLOR }} />
            Instituciones ({instituciones.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: PROV_COLOR }} />
            Proveedores ({proveedores.length})
          </span>
          <span className="text-slate-400 dark:text-zinc-600">
            {aristas.length} conexiones
          </span>
        </div>

        <p className="text-xs text-slate-400 dark:text-zinc-600 ml-auto hidden sm:block">
          Pasa el cursor sobre un nodo para resaltar sus conexiones · clic para ver detalle
        </p>
      </div>

      {/* SVG bipartito */}
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-[#05050a] overflow-y-auto overflow-x-hidden relative"
      >
        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#05050a]/90 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm">Cargando red...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!cargando && !error && datos && aristas.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No hay conexiones con los filtros actuales.</p>
          </div>
        )}

        {!cargando && !error && aristas.length > 0 && (
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ display: "block", minHeight: svgHeight }}
            onMouseLeave={() => {
              setHoveredInstId(null);
              setHoveredProvId(null);
              setTooltip(null);
            }}
          >
            <defs>
              <linearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={INST_COLOR} stopOpacity="0.7" />
                <stop offset="100%" stopColor={PROV_COLOR} stopOpacity="0.7" />
              </linearGradient>
            </defs>

            {/* ── Aristas (bezier) ── */}
            {aristas.map((a) => {
              const ii = instIndex.get(a.origen);
              const pi = provIndex.get(a.destino);
              if (ii === undefined || pi === undefined) return null;

              const y1 = yInst(ii);
              const y2 = yProv(pi, proveedores.length);
              const highlighted = isHighlighted(a);
              const opacity = highlighted ? 0.55 : 0.04;
              const strokeW = highlighted
                ? Math.min(Math.max(a.numContratos * 0.35, 0.8), 3.5)
                : 0.8;

              const pathD = `M ${dotXLeft} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${dotXRight} ${y2}`;
              const mx = midX;
              const my = (y1 + y2) / 2;

              return (
                <path
                  key={`${a.origen}-${a.destino}`}
                  d={pathD}
                  fill="none"
                  stroke={`url(#${GRAD_ID})`}
                  strokeWidth={strokeW}
                  opacity={opacity}
                  style={{ transition: "opacity 0.18s, stroke-width 0.18s", cursor: "default" }}
                  onMouseEnter={(e) => {
                    setTooltip({
                      x: mx,
                      y: my,
                      texto: `${a.numContratos} contrato${a.numContratos !== 1 ? "s" : ""}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}

            {/* ── Tooltip sobre arista ── */}
            {tooltip && (
              <g transform={`translate(${tooltip.x}, ${tooltip.y})`} style={{ pointerEvents: "none" }}>
                <rect x={-38} y={-13} width={76} height={22} rx={4} fill="#0d0d1a" stroke="#1a1a2e" strokeWidth={1} />
                <text x={0} y={4} textAnchor="middle" fontSize={11} fill="#a1a1aa" fontFamily="Geist Mono, monospace">
                  {tooltip.texto}
                </text>
              </g>
            )}

            {/* ── Nodos y etiquetas — Instituciones (izquierda) ── */}
            {instituciones.map((inst, i) => {
              const y = yInst(i);
              const isHov = hoveredInstId === inst.id;
              const dimmed = hoveredInstId !== null && !isHov && hoveredProvId === null;

              return (
                <g
                  key={inst.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredInstId(inst.id)}
                  onMouseLeave={() => setHoveredInstId(null)}
                  onClick={() => abrirPanel("institucion", inst.id, inst.nombre)}
                  opacity={dimmed ? 0.3 : 1}
                >
                  {/* Punto */}
                  <circle
                    cx={dotXLeft}
                    cy={y}
                    r={isHov ? DOT_R + 1.5 : DOT_R}
                    fill={INST_COLOR}
                    style={{ transition: "r 0.15s" }}
                  />
                  {/* Etiqueta */}
                  <text
                    x={dotXLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11.5}
                    fontFamily="Geist Sans, sans-serif"
                    fill={isHov ? "#e2e8f0" : "#71717a"}
                    style={{ transition: "fill 0.15s", userSelect: "none" }}
                  >
                    {inst.nombre.length > 30 ? inst.nombre.slice(0, 29) + "…" : inst.nombre}
                  </text>
                </g>
              );
            })}

            {/* ── Nodos y etiquetas — Proveedores (derecha) ── */}
            {proveedores.map((prov, i) => {
              const y = yProv(i, proveedores.length);
              const isHov = hoveredProvId === prov.id;
              const dimmed = hoveredProvId !== null && !isHov && hoveredInstId === null;

              return (
                <g
                  key={prov.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredProvId(prov.id)}
                  onMouseLeave={() => setHoveredProvId(null)}
                  onClick={() => abrirPanel("proveedor", prov.id, prov.nombre)}
                  opacity={dimmed ? 0.3 : 1}
                >
                  {/* Punto */}
                  <circle
                    cx={dotXRight}
                    cy={y}
                    r={isHov ? DOT_R + 1.5 : DOT_R}
                    fill={PROV_COLOR}
                    style={{ transition: "r 0.15s" }}
                  />
                  {/* Etiqueta */}
                  <text
                    x={dotXRight + 10}
                    y={y + 4}
                    textAnchor="start"
                    fontSize={11.5}
                    fontFamily="Geist Sans, sans-serif"
                    fill={isHov ? "#e2e8f0" : "#71717a"}
                    style={{ transition: "fill 0.15s", userSelect: "none" }}
                  >
                    {prov.nombre.length > 30 ? prov.nombre.slice(0, 29) + "…" : prov.nombre}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Panel deslizante de detalle */}
      <PanelDeslizante
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        titulo={panelTitulo}
      >
        <div className="px-6 py-5">
          {panelCargando ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : panelContratos.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500">No se encontraron contratos.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">
                Últimos {panelContratos.length} contratos
              </p>
              {panelContratos.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-100 dark:border-[#1a1a2e] bg-slate-50 dark:bg-[#0a0a14] p-4"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-zinc-100 leading-snug mb-2">
                    {c.titulo ?? "Sin título"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
                    {c.valor && (
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                        {c.moneda ?? "RD$"} {Number(c.valor).toLocaleString("es-DO")}
                      </span>
                    )}
                    {c.fecha_firma && (
                      <span>{new Date(c.fecha_firma).toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" })}</span>
                    )}
                    {c.institucion_nombre && <span>{c.institucion_nombre}</span>}
                    {c.proveedores?.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {c.proveedores.map((p) => p.nombre).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PanelDeslizante>
    </div>
  );
}
