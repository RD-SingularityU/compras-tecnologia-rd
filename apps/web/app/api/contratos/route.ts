import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const busqueda = searchParams.get("busqueda") ?? "";
  const institucionId = searchParams.get("institucion_id");
  const proveedorId = searchParams.get("proveedor_id");
  const ordenar = searchParams.get("ordenar") ?? "fecha_firma";
  const direccion = searchParams.get("dir") === "asc" ? "ASC" : "DESC";
  const offset = (pagina - 1) * limite;

  const columnasValidas: Record<string, string> = {
    titulo: "c.titulo",
    valor: "c.valor::numeric",
    fecha_firma: "c.fecha_firma",
    institucion: "i.nombre",
  };

  const condiciones: string[] = [];
  if (busqueda) {
    condiciones.push(
      `(c.titulo ILIKE '%${busqueda.replace(/'/g, "''")}%' OR c.descripcion ILIKE '%${busqueda.replace(/'/g, "''")}%')`
    );
  }
  if (institucionId) {
    condiciones.push(`c.institucion_id = '${institucionId}'`);
  }
  if (proveedorId) {
    condiciones.push(
      `c.id IN (SELECT contrato_id FROM contrato_proveedores WHERE proveedor_id = '${proveedorId}')`
    );
  }

  const where =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const [datos, conteo] = await Promise.all([
    getDb().execute(sql.raw(`
      SELECT c.id, c.ocid, c.titulo, c.descripcion, c.estado, c.valor, c.moneda,
             c.fecha_firma, c.periodo_inicio, c.periodo_fin,
             i.nombre as institucion_nombre, i.id as institucion_id,
             COALESCE(
               (SELECT json_agg(json_build_object('id', p.id, 'nombre', p.nombre, 'rnc', p.rnc))
                FROM contrato_proveedores cp JOIN proveedores p ON p.id = cp.proveedor_id
                WHERE cp.contrato_id = c.id), '[]'
             ) as proveedores
      FROM contratos c
      LEFT JOIN instituciones i ON i.id = c.institucion_id
      ${where}
      ORDER BY ${columnasValidas[ordenar] ?? "c.fecha_firma"} ${direccion} NULLS LAST
      LIMIT ${limite} OFFSET ${offset}
    `)),
    getDb().execute(sql.raw(`SELECT COUNT(*) as total FROM contratos c ${where}`)),
  ]);

  return NextResponse.json({
    datos: datos.rows,
    total: Number((conteo.rows[0] as { total: string }).total),
    pagina,
    limite,
  });
}
