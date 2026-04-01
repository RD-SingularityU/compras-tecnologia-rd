import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros, construirSubCondicionesContratos } from "@/lib/construir-filtros-sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const busqueda = searchParams.get("busqueda") ?? "";
  const ordenar = searchParams.get("ordenar") ?? "monto_total";
  const direccion = searchParams.get("dir") === "asc" ? "ASC" : "DESC";
  const offset = (pagina - 1) * limite;

  const columnasValidas: Record<string, string> = {
    nombre: "i.nombre",
    total_contratos: "total_contratos",
    monto_total: "monto_total",
    num_proveedores: "num_proveedores",
  };

  // Filtros globales
  const { condiciones } = construirCondicionesFiltros(searchParams, "instituciones");

  if (busqueda) {
    condiciones.push(`i.nombre ILIKE '%${busqueda.replace(/'/g, "''")}%'`);
  }

  const where =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  // Sub-condiciones de contratos para los agregados
  const subCond = construirSubCondicionesContratos(searchParams, "c");

  const [datos, conteo] = await Promise.all([
    getDb().execute(sql.raw(`
      SELECT i.id, i.nombre, i.rnc, i.sector,
             (SELECT COUNT(*) FROM contratos c WHERE c.institucion_id = i.id${subCond}) as total_contratos,
             (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contratos c WHERE c.institucion_id = i.id${subCond}) as monto_total,
             (SELECT COUNT(DISTINCT cp.proveedor_id)
              FROM contratos c JOIN contrato_proveedores cp ON cp.contrato_id = c.id
              WHERE c.institucion_id = i.id${subCond}) as num_proveedores
      FROM instituciones i
      ${where}
      ORDER BY ${columnasValidas[ordenar] ?? "monto_total"} ${direccion} NULLS LAST
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
