import { getDb, sql } from "@/lib/db";
import { DashboardCharts } from "./dashboard-charts";

function formatearMonto(valor: number): string {
  if (valor >= 1_000_000_000) return `RD$${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `RD$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `RD$${(valor / 1_000).toFixed(1)}K`;
  return `RD$${valor.toFixed(0)}`;
}

async function obtenerEstadisticas() {
  const result = await getDb().execute(sql`
    SELECT
      (SELECT COUNT(*) FROM contratos)::int as total_contratos,
      (SELECT COUNT(*) FROM proveedores)::int as total_proveedores,
      (SELECT COUNT(*) FROM instituciones)::int as total_instituciones,
      (SELECT COUNT(*) FROM licitaciones)::int as total_licitaciones,
      (SELECT COALESCE(SUM(valor::numeric), 0) FROM contratos) as monto_total
  `);
  return (result.rows[0] ?? {}) as Record<string, number>;
}

async function obtenerTopProveedores() {
  const result = await getDb().execute(sql`
    SELECT p.nombre, p.total_contratos, p.monto_total::float as monto
    FROM proveedores p
    WHERE p.total_contratos > 0
    ORDER BY p.monto_total::numeric DESC
    LIMIT 10
  `);
  return result.rows as Array<{
    nombre: string;
    total_contratos: number;
    monto: number;
  }>;
}

async function obtenerContratosPorMes() {
  const result = await getDb().execute(sql`
    SELECT
      TO_CHAR(fecha_firma, 'YYYY-MM') as mes,
      COUNT(*)::int as cantidad,
      COALESCE(SUM(valor::numeric), 0)::float as monto
    FROM contratos
    WHERE fecha_firma IS NOT NULL
    GROUP BY TO_CHAR(fecha_firma, 'YYYY-MM')
    ORDER BY mes DESC
    LIMIT 12
  `);
  return (result.rows as Array<{ mes: string; cantidad: number; monto: number }>).reverse();
}

export default async function PaginaDashboard() {
  const [stats, topProveedores, contratosPorMes] = await Promise.all([
    obtenerEstadisticas(),
    obtenerTopProveedores(),
    obtenerContratosPorMes(),
  ]);

  const tarjetas = [
    { titulo: "Contratos", valor: stats.total_contratos?.toLocaleString() ?? "0" },
    { titulo: "Proveedores", valor: stats.total_proveedores?.toLocaleString() ?? "0" },
    { titulo: "Instituciones", valor: stats.total_instituciones?.toLocaleString() ?? "0" },
    { titulo: "Monto Total", valor: formatearMonto(Number(stats.monto_total) || 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Resumen de contrataciones publicas de tecnologia en Republica
          Dominicana
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map((t) => (
          <div
            key={t.titulo}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              {t.titulo}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono">{t.valor}</p>
          </div>
        ))}
      </div>

      {/* Charts (client component) */}
      <DashboardCharts
        topProveedores={topProveedores}
        contratosPorMes={contratosPorMes}
      />
    </div>
  );
}
