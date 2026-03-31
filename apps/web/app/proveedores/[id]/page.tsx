export const dynamic = "force-dynamic";

import { getDb, sql } from "@/lib/db";
import { notFound } from "next/navigation";

function formatearMonto(valor: number): string {
  return `RD$${valor.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default async function PaginaProveedor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const provResult = await getDb().execute(
    sql.raw(`
    SELECT p.id, p.nombre, p.rnc, p.total_contratos, p.monto_total,
           p.direccion, p.contacto
    FROM proveedores p WHERE p.id = '${id}'
  `)
  );

  const proveedor = provResult.rows[0] as Record<string, unknown> | undefined;
  if (!proveedor) notFound();

  const contratosResult = await getDb().execute(
    sql.raw(`
    SELECT c.id, c.titulo, c.ocid, c.valor, c.fecha_firma, c.estado,
           i.nombre as institucion_nombre, i.id as institucion_id
    FROM contrato_proveedores cp
    JOIN contratos c ON c.id = cp.contrato_id
    LEFT JOIN instituciones i ON i.id = c.institucion_id
    WHERE cp.proveedor_id = '${id}'
    ORDER BY c.fecha_firma DESC NULLS LAST
    LIMIT 50
  `)
  );

  const institucionesResult = await getDb().execute(
    sql.raw(`
    SELECT DISTINCT i.id, i.nombre,
           COUNT(c.id)::int as num_contratos,
           SUM(c.valor::numeric)::float as monto
    FROM contrato_proveedores cp
    JOIN contratos c ON c.id = cp.contrato_id
    JOIN instituciones i ON i.id = c.institucion_id
    WHERE cp.proveedor_id = '${id}' AND c.institucion_id IS NOT NULL
    GROUP BY i.id, i.nombre
    ORDER BY monto DESC
  `)
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Proveedor
        </p>
        <h1 className="text-2xl font-bold mt-1">
          {proveedor.nombre as string}
        </h1>
        {proveedor.rnc ? (
          <p className="text-sm text-zinc-400 font-mono mt-1">
            RNC: {String(proveedor.rnc)}
          </p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Contratos</p>
          <p className="text-2xl font-bold font-mono">
            {(proveedor.total_contratos as number) ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Monto Total</p>
          <p className="text-2xl font-bold font-mono">
            {formatearMonto(parseFloat((proveedor.monto_total as string) ?? "0"))}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase">Instituciones</p>
          <p className="text-2xl font-bold font-mono">
            {institucionesResult.rows.length}
          </p>
        </div>
      </div>

      {/* Instituciones con las que trabaja */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Instituciones ({institucionesResult.rows.length})
        </h2>
        <div className="grid gap-2">
          {(
            institucionesResult.rows as Array<Record<string, unknown>>
          ).map((inst) => (
            <a
              key={inst.id as string}
              href={`/instituciones/${inst.id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:bg-zinc-800 transition-colors"
            >
              <span className="text-sm">{inst.nombre as string}</span>
              <span className="text-xs text-zinc-400 font-mono">
                {inst.num_contratos as number} contratos ·{" "}
                {formatearMonto(inst.monto as number)}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Contratos recientes */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Contratos Recientes</h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                  Titulo
                </th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                  Institucion
                </th>
                <th className="text-right px-4 py-2 text-zinc-400 font-medium">
                  Valor
                </th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {(contratosResult.rows as Array<Record<string, unknown>>).map(
                (c) => (
                  <tr
                    key={c.id as string}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="px-4 py-2 text-zinc-200">
                      {(c.titulo as string) || (c.ocid as string)}
                    </td>
                    <td className="px-4 py-2 text-zinc-400">
                      {(c.institucion_nombre as string) || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {c.valor
                        ? formatearMonto(parseFloat(c.valor as string))
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 font-mono text-xs">
                      {c.fecha_firma
                        ? new Date(
                            c.fecha_firma as string
                          ).toLocaleDateString("es-DO")
                        : "—"}
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
