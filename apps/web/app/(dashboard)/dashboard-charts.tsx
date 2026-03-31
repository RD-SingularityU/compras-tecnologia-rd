"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

function formatearMontoCorto(valor: number): string {
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return valor.toFixed(0);
}

export function DashboardCharts({
  topProveedores,
  contratosPorMes,
}: {
  topProveedores: Array<{
    nombre: string;
    total_contratos: number;
    monto: number;
  }>;
  contratosPorMes: Array<{ mes: string; cantidad: number; monto: number }>;
}) {
  const proveedoresData = topProveedores.map((p) => ({
    nombre: p.nombre.length > 25 ? p.nombre.slice(0, 25) + "..." : p.nombre,
    monto: p.monto,
    contratos: p.total_contratos,
  }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Top Proveedores */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Top 10 Proveedores por Monto
        </h2>
        {proveedoresData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={proveedoresData}
              layout="vertical"
              margin={{ left: 120, right: 20 }}
            >
              <XAxis
                type="number"
                tickFormatter={formatearMontoCorto}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                width={120}
              />
              <Tooltip
                formatter={(value) => [
                  `RD$${Number(value).toLocaleString()}`,
                  "Monto",
                ]}
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  color: "#e4e4e7",
                }}
              />
              <Bar dataKey="monto" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-12">
            Sin datos de proveedores
          </p>
        )}
      </div>

      {/* Contratos por Mes */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Contratos por Mes
        </h2>
        {contratosPorMes.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={contratosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="mes"
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  color: "#e4e4e7",
                }}
              />
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                name="Contratos"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-12">
            Sin datos historicos
          </p>
        )}
      </div>
    </div>
  );
}
