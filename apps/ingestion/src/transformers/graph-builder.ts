import { sql } from "drizzle-orm";
import { crearDb, type Database } from "@compras-rd/db/src/client";
import { grafoAristas } from "@compras-rd/db";

/**
 * Construye aristas del grafo pre-computadas a partir de los datos cargados
 * Crea relaciones:
 * - institucion <-> proveedor (por contratos)
 * - proveedor <-> proveedor (co-proveedores en misma licitacion)
 */
export async function construirGrafo(db?: Database) {
  const database = db ?? crearDb();

  console.log("Construyendo grafo de relaciones...");

  // 1. Aristas institucion -> proveedor (agregadas por contratos)
  console.log("  Calculando aristas institucion-proveedor...");
  await database.execute(sql`
    INSERT INTO grafo_aristas (
      id, nodo_origen_tipo, nodo_origen_id,
      nodo_destino_tipo, nodo_destino_id,
      tipo_relacion, peso, num_contratos, metadata
    )
    SELECT
      gen_random_uuid(),
      'institucion', c.institucion_id,
      'proveedor', cp.proveedor_id,
      'contrato',
      COALESCE(SUM(c.valor::numeric), 0),
      COUNT(*)::int,
      jsonb_build_object(
        'ultimo_contrato', MAX(c.fecha_firma),
        'primer_contrato', MIN(c.fecha_firma)
      )
    FROM contratos c
    JOIN contrato_proveedores cp ON cp.contrato_id = c.id
    WHERE c.institucion_id IS NOT NULL
    GROUP BY c.institucion_id, cp.proveedor_id
    ON CONFLICT (nodo_origen_id, nodo_destino_id, tipo_relacion)
    DO UPDATE SET
      peso = EXCLUDED.peso,
      num_contratos = EXCLUDED.num_contratos,
      metadata = EXCLUDED.metadata
  `);

  // 2. Aristas proveedor <-> proveedor (co-proveedores en misma licitacion)
  console.log("  Calculando aristas co-proveedor...");
  await database.execute(sql`
    INSERT INTO grafo_aristas (
      id, nodo_origen_tipo, nodo_origen_id,
      nodo_destino_tipo, nodo_destino_id,
      tipo_relacion, peso, num_contratos
    )
    SELECT
      gen_random_uuid(),
      'proveedor', ap1.proveedor_id,
      'proveedor', ap2.proveedor_id,
      'co-proveedor',
      0,
      COUNT(DISTINCT a.licitacion_id)::int
    FROM adjudicacion_proveedores ap1
    JOIN adjudicacion_proveedores ap2
      ON ap1.adjudicacion_id = ap2.adjudicacion_id
      AND ap1.proveedor_id < ap2.proveedor_id
    JOIN adjudicaciones a ON a.id = ap1.adjudicacion_id
    GROUP BY ap1.proveedor_id, ap2.proveedor_id
    HAVING COUNT(DISTINCT a.licitacion_id) >= 2
    ON CONFLICT (nodo_origen_id, nodo_destino_id, tipo_relacion)
    DO UPDATE SET
      num_contratos = EXCLUDED.num_contratos
  `);

  // Contar aristas creadas
  const countResult = await database.execute(
    sql`SELECT COUNT(*) as total FROM grafo_aristas`
  );
  const total = (countResult.rows?.[0] as { total: string })?.total ?? "?";
  console.log(`  Grafo construido: ${total} aristas`);
}
