import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { condiciones } = construirCondicionesFiltros(searchParams, "concentracion");

  const where =
    condiciones.length > 0
      ? `AND ${condiciones.join(" AND ")}`
      : "";

  const result = await getDb().execute(sql.raw(`
    SELECT
      h.institucion_id,
      i.nombre as institucion_nombre,
      h.hhi_score::float as hhi,
      h.num_proveedores,
      h.porcentaje_dominante::float as porcentaje_dominante,
      p.nombre as proveedor_dominante_nombre,
      CASE
        WHEN h.hhi_score::numeric < 1500 THEN 'competitivo'
        WHEN h.hhi_score::numeric < 2500 THEN 'moderado'
        ELSE 'concentrado'
      END as nivel
    FROM estadisticas_hhi h
    JOIN instituciones i ON i.id = h.institucion_id
    LEFT JOIN proveedores p ON p.id = h.proveedor_dominante_id
    WHERE 1=1 ${where}
    ORDER BY h.hhi_score::numeric DESC
    LIMIT 100
  `));

  return NextResponse.json({ datos: result.rows });
}
