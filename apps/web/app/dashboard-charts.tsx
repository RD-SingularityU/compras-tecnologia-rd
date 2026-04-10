"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatearMontoCorto(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return valor.toFixed(0);
}

function formatearMonto(valor: number): string {
  if (valor >= 1_000_000_000) return `RD$${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `RD$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `RD$${(valor / 1_000).toFixed(0)}K`;
  return `RD$${valor.toFixed(0)}`;
}

// Gradiente de colores para las barras (violet → cyan)
const COLORES_BARRAS = [
  "#8b5cf6",
  "#7c6cf8",
  "#6d7dfa",
  "#5e8ef8",
  "#4f9ef4",
  "#40aef0",
  "#31beed",
  "#22ceea",
  "#13dee7",
  "#00d4ff",
];

// ── Tooltip personalizado ─────────────────────────────────────────────────────

function TooltipOscuro({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: { nombreCompleto?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const nombre = payload[0]?.payload?.nombreCompleto ?? label ?? "";
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#2a2a40] bg-white dark:bg-[#0d0d1a] px-3 py-2 shadow-xl text-xs">
      {nombre && (
        <p className="font-medium text-slate-700 dark:text-zinc-200 mb-1 max-w-[200px] break-words">
          {nombre}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-500 dark:text-zinc-400">
          {p.name}: <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
            {formatearMonto(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

function TooltipMes({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#2a2a40] bg-white dark:bg-[#0d0d1a] px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-slate-700 dark:text-zinc-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-500 dark:text-zinc-400">
          {p.name}: <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
            {p.value.toLocaleString("es-DO")}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function DashboardCharts({
  topProveedores,
  contratosPorMes,
  distribucionPorTipo,
}: {
  topProveedores: Array<{
    id: string;
    nombre: string;
    total_contratos: number;
    monto: number;
  }>;
  contratosPorMes: Array<{ mes: string; cantidad: number; monto: number }>;
  distribucionPorTipo: Array<{ tipo: string; cantidad: number; monto: number }>;
}) {
  const router = useRouter();

  const esAnual = contratosPorMes[0]?.mes?.length === 4;

  const proveedoresData = topProveedores.map((p) => ({
    id: p.id,
    nombre: p.nombre.length > 22 ? p.nombre.slice(0, 22) + "…" : p.nombre,
    nombreCompleto: p.nombre,
    monto: p.monto,
    contratos: p.total_contratos,
  }));

  function irAContratos(id: string) {
    router.push(`/contratos?proveedor_id=${id}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* ── Top 10 Proveedores (3/5) ─────────────────────────────────── */}
      <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-4">
          Top 10 Proveedores por Monto
        </h2>
        {proveedoresData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={proveedoresData}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradienteBarras" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#00d4ff" />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  tickFormatter={formatearMontoCorto}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  width={140}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TooltipOscuro />} cursor={{ fill: "rgba(139,92,246,0.05)" }} />
                <Bar
                  dataKey="monto"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data?.id) irAContratos(data.id as string);
                  }}
                  name="Monto"
                >
                  {proveedoresData.map((_, i) => (
                    <Cell key={i} fill={COLORES_BARRAS[i] ?? "#8b5cf6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Lista clickeable */}
            <div className="mt-3 space-y-0.5">
              {topProveedores.slice(0, 5).map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => irAContratos(p.id)}
                  className="flex items-center justify-between w-full rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors group"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: COLORES_BARRAS[i] }}
                    />
                    <span className="text-slate-600 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-cyan-400 truncate">
                      {p.nombre}
                    </span>
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500 font-mono ml-2 flex-shrink-0">
                    {formatearMonto(p.monto)}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-slate-400 dark:text-zinc-500 text-sm text-center py-16">
            Sin datos de proveedores
          </p>
        )}
      </div>

      {/* ── Contratos por Mes / Año (2/5) ───────────────────────────── */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-4">
          {esAnual ? "Contratos por Año" : "Contratos por Mes"}
        </h2>
        {contratosPorMes.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={contratosPorMes} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradienteArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                className="dark:[&>line]:stroke-[#1a1a2e]"
                vertical={false}
              />
              <XAxis
                dataKey="mes"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => esAnual ? v : v.slice(5)}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipMes />} cursor={{ stroke: "#00d4ff", strokeWidth: 1, strokeDasharray: "4 2" }} />
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke="#00d4ff"
                strokeWidth={2}
                fill="url(#gradienteArea)"
                dot={{ fill: "#00d4ff", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#00d4ff", strokeWidth: 2, stroke: "#fff" }}
                name="Contratos"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 dark:text-zinc-500 text-sm text-center py-16">
            Sin datos históricos
          </p>
        )}
      </div>

      {/* ── Donut: Distribución por tipo de modalidad (fila completa) ─── */}
      <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-4">
          Distribución por Tipo de Modalidad
        </h2>
        {distribucionPorTipo.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={distribucionPorTipo}
                dataKey="cantidad"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {distribucionPorTipo.map((_, i) => (
                  <Cell key={i} fill={COLORES_BARRAS[i % COLORES_BARRAS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="rounded-lg border border-slate-200 dark:border-[#2a2a40] bg-white dark:bg-[#0d0d1a] px-3 py-2 shadow-xl text-xs">
                      <p className="font-medium text-slate-700 dark:text-zinc-200 mb-1 max-w-[220px] break-words">
                        {d?.name}
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400">
                        Contratos:{" "}
                        <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                          {Number(d?.value).toLocaleString("es-DO")}
                        </span>
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400">
                        Monto:{" "}
                        <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                          {formatearMonto(Number((d?.payload as { monto?: number })?.monto ?? 0))}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) =>
                  value.length > 40 ? value.slice(0, 40) + "…" : value
                }
                wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 dark:text-zinc-500 text-sm text-center py-16">
            Sin datos de modalidad
          </p>
        )}
      </div>
    </div>
  );
}
