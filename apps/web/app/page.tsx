export const dynamic = "force-dynamic";

import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFiltros } from "./dashboard-filtros";

function formatearMonto(valor: number): string {
  if (valor >= 1_000_000_000) return `RD$${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `RD$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `RD$${(valor / 1_000).toFixed(1)}K`;
  return `RD$${valor.toFixed(0)}`;
}

async function obtenerEstadisticas(searchParams: URLSearchParams) {
  const { condiciones, joinsExtra } = construirCondicionesFiltros(searchParams, "estadisticas");

  if (condiciones.length === 0) {
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

  const where = `WHERE ${condiciones.join(" AND ")}`;
  const joins = joinsExtra.join(" ");

  const result = await getDb().execute(sql.raw(`
    SELECT
      (SELECT COUNT(*) FROM contratos c ${joins} ${where})::int as total_contratos,
      (SELECT COUNT(DISTINCT cp.proveedor_id) FROM contratos c ${joins} JOIN contrato_proveedores cp ON cp.contrato_id = c.id ${where})::int as total_proveedores,
      (SELECT COUNT(DISTINCT c.institucion_id) FROM contratos c ${joins} ${where})::int as total_instituciones,
      (SELECT COUNT(*) FROM licitaciones)::int as total_licitaciones,
      (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c ${joins} ${where}) as monto_total
  `));
  return (result.rows[0] ?? {}) as Record<string, number>;
}

async function obtenerTopProveedores(searchParams: URLSearchParams) {
  const { condiciones, joinsExtra } = construirCondicionesFiltros(searchParams, "estadisticas");

  if (condiciones.length === 0) {
    const result = await getDb().execute(sql`
      SELECT p.id, p.nombre, p.total_contratos, p.monto_total::float as monto
      FROM proveedores p
      WHERE p.total_contratos > 0
      ORDER BY p.monto_total::numeric DESC
      LIMIT 10
    `);
    return result.rows as Array<{ id: string; nombre: string; total_contratos: number; monto: number }>;
  }

  const where = `WHERE ${condiciones.join(" AND ")}`;
  const joins = joinsExtra.join(" ");

  const result = await getDb().execute(sql.raw(`
    SELECT p.id, p.nombre,
           COUNT(*)::int as total_contratos,
           COALESCE(SUM(c.valor::numeric), 0)::float as monto
    FROM contrato_proveedores cp
    JOIN contratos c ON c.id = cp.contrato_id
    ${joins}
    JOIN proveedores p ON p.id = cp.proveedor_id
    ${where}
    GROUP BY p.id, p.nombre
    ORDER BY monto DESC
    LIMIT 10
  `));
  return result.rows as Array<{ id: string; nombre: string; total_contratos: number; monto: number }>;
}

async function obtenerContratosPorMes(searchParams: URLSearchParams) {
  const { condiciones, joinsExtra } = construirCondicionesFiltros(searchParams, "estadisticas");

  const baseCond = "c.fecha_firma IS NOT NULL";
  const extraCond = condiciones.length > 0 ? ` AND ${condiciones.join(" AND ")}` : "";
  const joins = joinsExtra.join(" ");

  const result = await getDb().execute(sql.raw(`
    SELECT
      TO_CHAR(c.fecha_firma, 'YYYY-MM') as mes,
      COUNT(*)::int as cantidad,
      COALESCE(SUM(c.valor::numeric), 0)::float as monto
    FROM contratos c
    ${joins}
    WHERE ${baseCond}${extraCond}
    GROUP BY TO_CHAR(c.fecha_firma, 'YYYY-MM')
    ORDER BY mes DESC
    LIMIT 12
  `));
  return (result.rows as Array<{ mes: string; cantidad: number; monto: number }>).reverse();
}

export default async function PaginaDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") sp.set(k, v);
  }

  const [stats, topProveedores, contratosPorMes] = await Promise.all([
    obtenerEstadisticas(sp),
    obtenerTopProveedores(sp),
    obtenerContratosPorMes(sp),
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

      {/* Filtros globales (client component) */}
      <DashboardFiltros />

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
