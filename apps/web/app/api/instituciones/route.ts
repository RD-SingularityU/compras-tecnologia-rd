import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const busqueda = searchParams.get("busqueda") ?? "";
  const offset = (pagina - 1) * limite;

  const where = busqueda
    ? `WHERE i.nombre ILIKE '%${busqueda.replace(/'/g, "''")}%'`
    : "";

  const [datos, conteo] = await Promise.all([
    getDb().execute(sql.raw(`
      SELECT i.id, i.nombre, i.rnc, i.sector,
             (SELECT COUNT(*) FROM contratos c WHERE c.institucion_id = i.id) as total_contratos,
             (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c WHERE c.institucion_id = i.id) as monto_total,
             (SELECT COUNT(DISTINCT cp.proveedor_id)
              FROM contratos c JOIN contrato_proveedores cp ON cp.contrato_id = c.id
              WHERE c.institucion_id = i.id) as num_proveedores
      FROM instituciones i
      ${where}
      ORDER BY (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c WHERE c.institucion_id = i.id) DESC
      LIMIT ${limite} OFFSET ${offset}
    `)),
    getDb().execute(
      sql.raw(`SELECT COUNT(*) as total FROM instituciones i ${where}`)
    ),
  ]);

  return NextResponse.json({
    datos: datos.rows,
    total: Number((conteo.rows[0] as { total: string }).total),
    pagina,
    limite,
  });
}
