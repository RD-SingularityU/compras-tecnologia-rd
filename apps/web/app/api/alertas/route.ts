import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const severidad = searchParams.get("severidad");
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "50"), 200);

  let where = "WHERE 1=1";
  if (tipo) where += ` AND a.tipo = '${tipo.replace(/'/g, "''")}'`;
  if (severidad) where += ` AND a.severidad = '${severidad.replace(/'/g, "''")}'`;

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

  const countResult = await getDb().execute(sql.raw(`
    SELECT
      COUNT(*) FILTER (WHERE severidad = 'alta') as alta,
      COUNT(*) FILTER (WHERE severidad = 'media') as media,
      COUNT(*) FILTER (WHERE severidad = 'baja') as baja,
      COUNT(*) as total
    FROM alertas
  `));

  return NextResponse.json({
    datos: result.rows,
    resumen: countResult.rows[0],
  });
}
