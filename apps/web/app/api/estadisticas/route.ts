import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { condiciones, joinsExtra } = construirCondicionesFiltros(searchParams, "estadisticas");

  const hayFiltros = condiciones.length > 0;

  if (!hayFiltros) {
    // Sin filtros: query simple original
    const result = await getDb().execute(sql`
      SELECT
        (SELECT COUNT(*) FROM contratos) as total_contratos,
        (SELECT COUNT(*) FROM proveedores) as total_proveedores,
        (SELECT COUNT(*) FROM instituciones) as total_instituciones,
        (SELECT COUNT(*) FROM licitaciones) as total_licitaciones,
        (SELECT COALESCE(SUM(valor::numeric), 0) FROM contratos) as monto_total,
        (SELECT COUNT(*) FROM grafo_aristas) as total_aristas
    `);
    return NextResponse.json(result.rows[0] ?? {});
  }

  // Con filtros: aplicar condiciones sobre contratos
  const where = `WHERE ${condiciones.join(" AND ")}`;
  const joins = joinsExtra.join("\n    ");

  const result = await getDb().execute(sql.raw(`
    SELECT
      (SELECT COUNT(*) FROM contratos c ${joins} ${where}) as total_contratos,
      (SELECT COUNT(DISTINCT cp.proveedor_id) FROM contratos c ${joins} JOIN contrato_proveedores cp ON cp.contrato_id = c.id ${where}) as total_proveedores,
      (SELECT COUNT(DISTINCT c.institucion_id) FROM contratos c ${joins} ${where}) as total_instituciones,
      (SELECT COUNT(*) FROM licitaciones) as total_licitaciones,
      (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c ${joins} ${where}) as monto_total,
      (SELECT COUNT(*) FROM grafo_aristas) as total_aristas
  `));

  return NextResponse.json(result.rows[0] ?? {});
}
