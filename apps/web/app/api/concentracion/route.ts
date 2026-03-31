import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET() {
  const result = await getDb().execute(sql`
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
    ORDER BY h.hhi_score::numeric DESC
    LIMIT 100
  `);

  return NextResponse.json({ datos: result.rows });
}
