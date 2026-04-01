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
    nombre: "p.nombre",
    monto_total: "monto_total",
    total_contratos: "total_contratos",
    num_instituciones: "num_instituciones",
  };

  // Filtros globales
  const { condiciones } = construirCondicionesFiltros(searchParams, "proveedores");

  if (busqueda) {
    condiciones.push(
      `(p.nombre ILIKE '%${busqueda.replace(/'/g, "''")}%' OR p.rnc ILIKE '%${busqueda.replace(/'/g, "''")}%')`
    );
  }

  const where =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  // Sub-condiciones de contratos para los agregados
  const subCond = construirSubCondicionesContratos(searchParams, "c");

  // Detectar si hay filtros de contratos activos (para usar subqueries filtradas)
  const hayFiltrosContratos = subCond.length > 0 ||
    searchParams.get("sector") ||
    searchParams.get("institucion_id");

  // Si hay filtros activos, calcular los agregados desde contratos filtrados
  const sectorJoin = searchParams.get("sector")
    ? "JOIN instituciones isub ON isub.id = c.institucion_id"
    : "";
  const sectorCond = searchParams.get("sector")
    ? ` AND isub.sector = '${searchParams.get("sector")!.replace(/'/g, "''")}'`
    : "";
  const instCond = searchParams.get("institucion_id")
    ? ` AND c.institucion_id = '${searchParams.get("institucion_id")}'`
    : "";

  const selectAgregados = hayFiltrosContratos
    ? `(SELECT COUNT(*) FROM contrato_proveedores cp2 JOIN contratos c ON c.id = cp2.contrato_id ${sectorJoin} WHERE cp2.proveedor_id = p.id${subCond}${sectorCond}${instCond}) as total_contratos,
             (SELECT COALESCE(SUM(c.valor::numeric), 0) FROM contrato_proveedores cp2 JOIN contratos c ON c.id = cp2.contrato_id ${sectorJoin} WHERE cp2.proveedor_id = p.id${subCond}${sectorCond}${instCond}) as monto_total,
             (SELECT COUNT(DISTINCT c.institucion_id) FROM contrato_proveedores cp2 JOIN contratos c ON c.id = cp2.contrato_id ${sectorJoin} WHERE cp2.proveedor_id = p.id${subCond}${sectorCond}${instCond}) as num_instituciones`
    : `p.total_contratos::int as total_contratos, p.monto_total,
             (SELECT COUNT(DISTINCT c.institucion_id)
              FROM contrato_proveedores cp JOIN contratos c ON c.id = cp.contrato_id
              WHERE cp.proveedor_id = p.id) as num_instituciones`;

  const orderCol = columnasValidas[ordenar] ?? "monto_total";

  const [datos, conteo] = await Promise.all([
    getDb().execute(sql.raw(`
      SELECT p.id, p.nombre, p.rnc,
             ${selectAgregados}
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
