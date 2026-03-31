import { sql } from "drizzle-orm";
import { crearDb, type Database } from "@compras-rd/db/src/client";
import { estadisticasHhi } from "@compras-rd/db";

/**
 * Calcula el Indice Herfindahl-Hirschman (HHI) por institucion
 * HHI = sum(market_share_i^2) donde market_share es el % del monto
 * HHI < 1500 = competitivo
 * 1500 <= HHI < 2500 = moderadamente concentrado
 * HHI >= 2500 = altamente concentrado
 */
export async function calcularHhi(db?: Database) {
  const database = db ?? crearDb();

  console.log("Calculando indices HHI...");

  // Limpiar HHI anteriores
  await database.execute(sql`DELETE FROM estadisticas_hhi`);

  // Calcular HHI por institucion (todos los periodos)
  await database.execute(sql`
    INSERT INTO estadisticas_hhi (
      id, institucion_id, categoria, periodo,
      hhi_score, num_proveedores,
      proveedor_dominante_id, porcentaje_dominante,
      calculado_en
    )
    SELECT
      gen_random_uuid(),
      sub.institucion_id,
      'general',
      'total',
      sub.hhi,
      sub.num_proveedores,
      sub.proveedor_dominante_id,
      sub.porcentaje_dominante,
      NOW()
    FROM (
      SELECT
        c.institucion_id,
        -- HHI = sum((share * 100)^2)
        SUM(POWER(
          (cp_sum.monto_proveedor / NULLIF(inst_total.monto_total, 0)) * 100,
          2
        ))::numeric(10,2) as hhi,
        COUNT(DISTINCT cp_sum.proveedor_id)::int as num_proveedores,
        -- Proveedor dominante
        (ARRAY_AGG(cp_sum.proveedor_id ORDER BY cp_sum.monto_proveedor DESC))[1] as proveedor_dominante_id,
        -- Porcentaje del dominante
        (MAX(cp_sum.monto_proveedor) / NULLIF(inst_total.monto_total, 0) * 100)::numeric(5,2) as porcentaje_dominante
      FROM contratos c
      JOIN (
        SELECT cp.proveedor_id, c2.institucion_id,
               SUM(c2.valor::numeric) as monto_proveedor
        FROM contrato_proveedores cp
        JOIN contratos c2 ON c2.id = cp.contrato_id
        WHERE c2.institucion_id IS NOT NULL AND c2.valor IS NOT NULL
        GROUP BY cp.proveedor_id, c2.institucion_id
      ) cp_sum ON cp_sum.institucion_id = c.institucion_id
      JOIN (
        SELECT institucion_id, SUM(valor::numeric) as monto_total
        FROM contratos
        WHERE institucion_id IS NOT NULL AND valor IS NOT NULL
        GROUP BY institucion_id
      ) inst_total ON inst_total.institucion_id = c.institucion_id
      WHERE c.institucion_id IS NOT NULL AND c.valor IS NOT NULL
      GROUP BY c.institucion_id, inst_total.monto_total
      HAVING COUNT(DISTINCT cp_sum.proveedor_id) >= 2
    ) sub
  `);

  // Contar resultados
  const countResult = await database.execute(
    sql`SELECT COUNT(*) as total FROM estadisticas_hhi`
  );
  const total = (countResult.rows[0] as { total: string })?.total ?? "0";
  console.log(`  HHI calculado para ${total} instituciones`);
}
