import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const severidad = searchParams.get("severidad");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "50"), 200);

  // Filtros globales
  const { condiciones } = construirCondicionesFiltros(searchParams, "alertas");

  // Filtros propios
  if (tipo) condiciones.push(`a.tipo = '${tipo.replace(/'/g, "''")}'`);
  if (severidad) condiciones.push(`a.severidad = '${severidad.replace(/'/g, "''")}'`);

  const where =
    condiciones.length > 0
      ? `WHERE ${condiciones.join(" AND ")}`
      : "";

  const result = await getDb().execute(sql.raw(`
    SELECT
      a.id, a.tipo, a.severidad, a.descripcion,
      a.entidad_tipo, a.entidad_id, a.datos,
      a.detectado_en
    FROM alertas a
    ${where}
    ORDER BY
      CASE a.severidad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      a.detectado_en DESC
    LIMIT ${limite}
  `));

  // El resumen tambien se filtra
  const resumenWhere = where.replace(/\ba\./g, "alertas_r.");
  const countResult = await getDb().execute(sql.raw(`
    SELECT
      COUNT(*) FILTER (WHERE alertas_r.severidad = 'alta') as alta,
      COUNT(*) FILTER (WHERE alertas_r.severidad = 'media') as media,
      COUNT(*) FILTER (WHERE alertas_r.severidad = 'baja') as baja,
      COUNT(*) as total
    FROM alertas alertas_r
    ${resumenWhere.replace(/\ba\./g, "alertas_r.")}
  `));

  return NextResponse.json({
    datos: result.rows,
    resumen: countResult.rows[0],
  });
}
