import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const busqueda = searchParams.get("busqueda") ?? "";
  const ordenar = searchParams.get("ordenar") ?? "monto_total";
  const direccion = searchParams.get("dir") === "asc" ? "ASC" : "DESC";
  const offset = (pagina - 1) * limite;

  const where = busqueda
    ? `WHERE p.nombre ILIKE '%${busqueda.replace(/'/g, "''")}%' OR p.rnc ILIKE '%${busqueda.replace(/'/g, "''")}%'`
    : "";

  const columnasValidas: Record<string, string> = {
    nombre: "p.nombre",
    monto_total: "p.monto_total::numeric",
    total_contratos: "p.total_contratos",
    num_instituciones: "num_instituciones",
  };
  const orderCol = columnasValidas[ordenar] ?? "p.monto_total::numeric";

  const [datos, conteo] = await Promise.all([
    getDb().execute(sql.raw(`
      SELECT p.id, p.nombre, p.rnc, p.total_contratos, p.monto_total,
             (SELECT COUNT(DISTINCT c.institucion_id)
              FROM contrato_proveedores cp JOIN contratos c ON c.id = cp.contrato_id
              WHERE cp.proveedor_id = p.id) as num_instituciones
      FROM proveedores p
      ${where}
      ORDER BY ${orderCol} ${direccion} NULLS LAST
      LIMIT ${limite} OFFSET ${offset}
    `)),
    getDb().execute(sql.raw(`SELECT COUNT(*) as total FROM proveedores p ${where}`)),
  ]);

  return NextResponse.json({
    datos: datos.rows,
    total: Number((conteo.rows[0] as { total: string }).total),
    pagina,
    limite,
  });
}
