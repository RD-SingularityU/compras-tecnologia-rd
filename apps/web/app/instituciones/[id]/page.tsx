export const dynamic = "force-dynamic";

import { getDb, sql } from "@/lib/db";
import { notFound } from "next/navigation";

function formatearMonto(valor: number): string {
  return `RD$${valor.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default async function PaginaInstitucion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const instResult = await getDb().execute(
    sql.raw(`
    SELECT i.id, i.nombre, i.rnc, i.sector,
           (SELECT COUNT(*) FROM contratos c WHERE c.institucion_id = i.id)::int as total_contratos,
           (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c WHERE c.institucion_id = i.id)::float as monto_total
    FROM instituciones i WHERE i.id = '${id}'
  `)
  );

  const institucion = instResult.rows[0] as Record<string, unknown> | undefined;
  if (!institucion) notFound();

  const proveedoresResult = await getDb().execute(
    sql.raw(`
    SELECT p.id, p.nombre, p.rnc,
           COUNT(c.id)::int as num_contratos,
           SUM(c.valor::numeric)::float as monto,
           (SUM(c.valor::numeric) / NULLIF(${institucion.monto_total}, 0) * 100)::numeric(5,1) as porcentaje
    FROM contrato_proveedores cp
    JOIN contratos c ON c.id = cp.contrato_id
    JOIN proveedores p ON p.id = cp.proveedor_id
    WHERE c.institucion_id = '${id}'
    GROUP BY p.id, p.nombre, p.rnc
    ORDER BY monto DESC
    LIMIT 20
  `)
  );

  const hhiResult = await getDb().execute(
    sql.raw(`
    SELECT hhi_score::float as hhi, num_proveedores, porcentaje_dominante::float
    FROM estadisticas_hhi
    WHERE institucion_id = '${id}'
    LIMIT 1
  `)
  );
  const hhi = hhiResult.rows[0] as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Institucion
        </p>
        <h1 className="text-2xl font-bold mt-1">
          {institucion.nombre as string}
        </h1>
        {institucion.sector ? (
          <p className="text-sm text-zinc-400 mt-1">
            {String(institucion.sector)}
          </p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Contratos</p>
          <p className="text-2xl font-bold font-mono">
            {(institucion.total_contratos as number) ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Monto Total</p>
          <p className="text-2xl font-bold font-mono">
            {formatearMonto((institucion.monto_total as number) ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Proveedores</p>
          <p className="text-2xl font-bold font-mono">
            {proveedoresResult.rows.length}
          </p>
        </div>
        {hhi && (
          <div
            className={`rounded-lg border p-4 ${
              (hhi.hhi as number) >= 2500
                ? "border-red-400/20 bg-red-400/5"
                : (hhi.hhi as number) >= 1500
                  ? "border-yellow-400/20 bg-yellow-400/5"
                  : "border-green-400/20 bg-green-400/5"
            }`}
          >
            <p className="text-xs text-zinc-500 uppercase">HHI</p>
            <p className="text-2xl font-bold font-mono">
              {((hhi.hhi as number) ?? 0).toFixed(0)}
            </p>
          </div>
        )}
      </div>

      {/* Top Proveedores */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Proveedores ({proveedoresResult.rows.length})
        </h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                  Proveedor
                </th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                  RNC
                </th>
                <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                  Contratos
                </th>
                <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                  Monto
                </th>
                <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(proveedoresResult.rows as Array<Record<string, unknown>>).map(
                (p) => (
                  <tr
                    key={p.id as string}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="px-4 py-2">
                      <a
                        href={`/proveedores/${p.id}`}
                        className="text-zinc-200 hover:text-blue-400"
                      >
                        {p.nombre as string}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-zinc-400 font-mono text-xs">
                      {(p.rnc as string) || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {p.num_contratos as number}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {p.monto ? formatearMonto(p.monto as number) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {p.porcentaje ? `${p.porcentaje}%` : "—"}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
