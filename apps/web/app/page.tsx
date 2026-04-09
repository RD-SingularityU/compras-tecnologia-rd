export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFiltros } from "./dashboard-filtros";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatearMonto(valor: number): string {
  if (valor >= 1_000_000_000) return `RD$${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `RD$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `RD$${(valor / 1_000).toFixed(1)}K`;
  return `RD$${valor.toFixed(0)}`;
}

function formatearMontoCorto(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return valor.toFixed(0);
}

// ── Queries ───────────────────────────────────────────────────────────────────

async function obtenerEstadisticas(searchParams: URLSearchParams) {
  const { condiciones, joinsExtra } = construirCondicionesFiltros(searchParams, "estadisticas");

  if (condiciones.length === 0) {
    const result = await getDb().execute(sql`
      SELECT
        (SELECT COUNT(*) FROM contratos)::int as total_contratos,
        (SELECT COUNT(*) FROM proveedores)::int as total_proveedores,
        (SELECT COUNT(*) FROM instituciones)::int as total_instituciones,
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

async function obtenerContratosRecientes() {
  const result = await getDb().execute(sql`
    SELECT
      c.id,
      c.titulo,
      c.valor::float as valor,
      c.estado,
      COALESCE(c.fecha_firma, c.creado_en) as fecha_firma,
      i.nombre as institucion_nombre,
      i.id as institucion_id,
      p.nombre as proveedor_nombre,
      p.id as proveedor_id
    FROM contratos c
    LEFT JOIN instituciones i ON i.id = c.institucion_id
    LEFT JOIN contrato_proveedores cp ON cp.contrato_id = c.id
    LEFT JOIN proveedores p ON p.id = cp.proveedor_id
    ORDER BY c.creado_en DESC
    LIMIT 6
  `);
  return result.rows as Array<{
    id: string;
    titulo: string;
    valor: number;
    estado: string;
    fecha_firma: string;
    institucion_nombre: string;
    institucion_id: string;
    proveedor_nombre: string;
    proveedor_id: string;
  }>;
}

async function obtenerAlertasRecientes() {
  const result = await getDb().execute(sql`
    SELECT id, tipo, severidad, descripcion, detectado_en
    FROM alertas
    ORDER BY detectado_en DESC
    LIMIT 6
  `);
  return result.rows as Array<{
    id: string;
    tipo: string;
    severidad: string;
    descripcion: string;
    detectado_en: string;
  }>;
}

// ── Configuracion de tarjetas KPI ────────────────────────────────────────────

const CONFIG_TARJETAS = [
  {
    key: "total_contratos",
    titulo: "Contratos",
    color: "cyan",
    borderClass: "border-l-cyan-400 dark:border-l-cyan-400",
    bgClass: "bg-cyan-400/5",
    textClass: "text-cyan-600 dark:text-cyan-400",
    icono: <IconDocumento />,
  },
  {
    key: "total_proveedores",
    titulo: "Proveedores",
    color: "violet",
    borderClass: "border-l-violet-400 dark:border-l-violet-400",
    bgClass: "bg-violet-400/5",
    textClass: "text-violet-600 dark:text-violet-400",
    icono: <IconPersonas />,
  },
  {
    key: "total_instituciones",
    titulo: "Instituciones",
    color: "amber",
    borderClass: "border-l-amber-400 dark:border-l-amber-400",
    bgClass: "bg-amber-400/5",
    textClass: "text-amber-600 dark:text-amber-400",
    icono: <IconInstitucion />,
  },
  {
    key: "monto_total",
    titulo: "Monto Total",
    color: "emerald",
    borderClass: "border-l-emerald-400 dark:border-l-emerald-400",
    bgClass: "bg-emerald-400/5",
    textClass: "text-emerald-600 dark:text-emerald-400",
    icono: <IconMoneda />,
    formato: "monto",
  },
] as const;

const COLORES_SEVERIDAD: Record<string, string> = {
  ALTA: "bg-red-500/10 border-l-red-500 text-red-500 dark:text-red-400",
  MEDIA: "bg-amber-500/10 border-l-amber-500 text-amber-600 dark:text-amber-400",
  BAJA: "bg-blue-500/10 border-l-blue-500 text-blue-600 dark:text-blue-400",
};

const BADGE_SEVERIDAD: Record<string, string> = {
  ALTA: "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20",
  MEDIA: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  BAJA: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
};

// ── Componente principal ──────────────────────────────────────────────────────

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

  const [stats, topProveedores, contratosPorMes, contratosRecientes, alertasRecientes] =
    await Promise.all([
      obtenerEstadisticas(sp),
      obtenerTopProveedores(sp),
      obtenerContratosPorMes(sp),
      obtenerContratosRecientes(),
      obtenerAlertasRecientes(),
    ]);

  return (
    <div className="space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Contrataciones públicas de tecnología en República Dominicana
          </p>
        </div>
      </div>

      {/* ── Filtros globales ─────────────────────────────────────────────── */}
      <DashboardFiltros />

      {/* ── Tarjetas KPI ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CONFIG_TARJETAS.map((cfg) => {
          const valorRaw = Number(stats[cfg.key]) || 0;
          const valor =
            cfg.titulo === "Monto Total"
              ? formatearMonto(valorRaw)
              : valorRaw.toLocaleString("es-DO");

          return (
            <div
              key={cfg.titulo}
              className={`rounded-xl border-l-4 ${cfg.borderClass} border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  {cfg.titulo}
                </p>
                <p className={`text-3xl font-bold font-mono ${cfg.textClass}`}>
                  {valor}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${cfg.bgClass} ${cfg.textClass}`}>
                {cfg.icono}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────────────── */}
      <DashboardCharts
        topProveedores={topProveedores}
        contratosPorMes={contratosPorMes}
      />

      {/* ── Fila inferior: Contratos recientes + Alertas ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Contratos recientes (3/5 del ancho) */}
        <div className="xl:col-span-3 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1a1a2e] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
              Contratos Recientes
            </h2>
            <Link
              href="/contratos"
              className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1a1a2e]">
                  {["Fecha", "Institución", "Proveedor", "Valor", "Estado"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contratosRecientes.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-50 dark:border-[#13131f] hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors ${
                      i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-[#0a0a12]/40"
                    }`}
                  >
                    <td className="px-5 py-3 text-xs text-slate-400 dark:text-zinc-500 font-mono whitespace-nowrap">
                      {c.fecha_firma
                        ? new Date(c.fecha_firma).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 max-w-[160px]">
                      {c.institucion_id ? (
                        <Link
                          href={`/instituciones/${c.institucion_id}`}
                          className="text-xs text-blue-600 dark:text-cyan-400 hover:underline truncate block"
                          title={c.institucion_nombre}
                        >
                          {c.institucion_nombre ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-[160px]">
                      {c.proveedor_id ? (
                        <Link
                          href={`/proveedores/${c.proveedor_id}`}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate block"
                          title={c.proveedor_nombre}
                        >
                          {c.proveedor_nombre ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                      {c.valor ? formatearMontoCorto(c.valor) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <BadgeEstado estado={c.estado} />
                    </td>
                  </tr>
                ))}
                {contratosRecientes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-zinc-500">
                      Sin contratos recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas recientes (2/5 del ancho) */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 dark:border-[#1a1a2e] bg-white dark:bg-[#0d0d1a] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1a1a2e] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
              Alertas Recientes
            </h2>
            <Link
              href="/alertas"
              className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-[#13131f]">
            {alertasRecientes.map((a) => {
              const colorClase = COLORES_SEVERIDAD[a.severidad] ?? COLORES_SEVERIDAD.BAJA;
              const badgeClase = BADGE_SEVERIDAD[a.severidad] ?? BADGE_SEVERIDAD.BAJA;
              return (
                <div
                  key={a.id}
                  className={`px-5 py-3.5 border-l-4 ${colorClase} hover:bg-slate-50 dark:hover:bg-[#13131f] transition-colors`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeClase}`}>
                      {a.severidad}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize">
                      {a.tipo?.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                    {a.descripcion}
                  </p>
                </div>
              );
            })}
            {alertasRecientes.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-zinc-500">
                Sin alertas detectadas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: string }) {
  const s = (estado ?? "").toUpperCase();
  if (s.includes("ADJUDIC")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide whitespace-nowrap">
        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
        Adjudicado
      </span>
    );
  }
  if (s.includes("PROCESO") || s.includes("ACTIVO")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide whitespace-nowrap">
        <span className="w-1 h-1 rounded-full bg-amber-500 inline-block animate-pulse" />
        En proceso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 uppercase tracking-wide whitespace-nowrap">
      {estado ?? "—"}
    </span>
  );
}

// ── Iconos KPI ────────────────────────────────────────────────────────────────

function IconDocumento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconPersonas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconInstitucion() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="13" y="9" width="2" height="2" />
    </svg>
  );
}

function IconMoneda() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 000 4h4a2 2 0 010 4H8" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
    </svg>
  );
}
