import { sql } from "drizzle-orm";
import { crearDb, type Database } from "@compras-rd/db/src/client";

/**
 * Motor de deteccion de red flags en contrataciones
 * Ejecuta multiples reglas y guarda alertas en la tabla `alertas`
 */
export async function detectarRedFlags(db?: Database) {
  const database = db ?? crearDb();

  console.log("Ejecutando deteccion de red flags...");

  // Limpiar alertas anteriores
  await database.execute(sql`DELETE FROM alertas`);

  let totalAlertas = 0;

  // REGLA 1: Proveedor unico (licitaciones con un solo oferente)
  console.log("  Regla 1: Proveedor unico...");
  const r1 = await database.execute(sql`
    INSERT INTO alertas (id, tipo, severidad, descripcion, entidad_tipo, entidad_id, datos, detectado_en)
    SELECT
      gen_random_uuid(),
      'proveedor_unico',
      'media',
      'Licitacion con un solo oferente: ' || l.titulo,
      'licitacion',
      l.id,
      jsonb_build_object(
        'licitacion_titulo', l.titulo,
        'institucion_id', l.institucion_id,
        'num_oferentes', l.num_oferentes,
        'valor_estimado', l.valor_estimado
      ),
      NOW()
    FROM licitaciones l
    WHERE l.num_oferentes = 1
    AND l.valor_estimado IS NOT NULL
    AND l.valor_estimado::numeric > 100000
    RETURNING id
  `);
  totalAlertas += r1.rows.length;
  console.log(`    ${r1.rows.length} alertas`);

  // REGLA 2: Concentracion excesiva (proveedor > 40% del gasto de una institucion)
  console.log("  Regla 2: Concentracion excesiva...");
  const r2 = await database.execute(sql`
    INSERT INTO alertas (id, tipo, severidad, descripcion, entidad_tipo, entidad_id, datos, detectado_en)
    SELECT
      gen_random_uuid(),
      'concentracion_excesiva',
      'alta',
      p.nombre || ' concentra ' || ROUND(pct, 1) || '% del gasto de ' || i.nombre,
      'proveedor',
      p.id,
      jsonb_build_object(
        'proveedor_nombre', p.nombre,
        'proveedor_id', p.id,
        'institucion_nombre', i.nombre,
        'institucion_id', i.id,
        'porcentaje', ROUND(pct, 1),
        'monto_proveedor', monto_prov,
        'monto_total_institucion', monto_inst
      ),
      NOW()
    FROM (
      SELECT
        cp.proveedor_id,
        c.institucion_id,
        SUM(c.valor::numeric) as monto_prov,
        inst_total.monto_total as monto_inst,
        (SUM(c.valor::numeric) / NULLIF(inst_total.monto_total, 0) * 100) as pct
      FROM contrato_proveedores cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN (
        SELECT institucion_id, SUM(valor::numeric) as monto_total
        FROM contratos WHERE valor IS NOT NULL AND institucion_id IS NOT NULL
        GROUP BY institucion_id
        HAVING SUM(valor::numeric) > 1000000
      ) inst_total ON inst_total.institucion_id = c.institucion_id
      WHERE c.valor IS NOT NULL AND c.institucion_id IS NOT NULL
      GROUP BY cp.proveedor_id, c.institucion_id, inst_total.monto_total
      HAVING (SUM(c.valor::numeric) / NULLIF(inst_total.monto_total, 0) * 100) > 40
    ) sub
    JOIN proveedores p ON p.id = sub.proveedor_id
    JOIN instituciones i ON i.id = sub.institucion_id
    RETURNING id
  `);
  totalAlertas += r2.rows.length;
  console.log(`    ${r2.rows.length} alertas`);

  // REGLA 3: Contratos sin licitacion (compra directa de alto valor)
  console.log("  Regla 3: Compras directas de alto valor...");
  const r3 = await database.execute(sql`
    INSERT INTO alertas (id, tipo, severidad, descripcion, entidad_tipo, entidad_id, datos, detectado_en)
    SELECT
      gen_random_uuid(),
      'compra_directa_alto_valor',
      'media',
      'Contrato de alto valor por compra directa: ' || COALESCE(c.titulo, c.ocid),
      'contrato',
      c.id,
      jsonb_build_object(
        'contrato_titulo', COALESCE(c.titulo, c.ocid),
        'valor', c.valor,
        'institucion_id', c.institucion_id,
        'metodo', l.metodo_adquisicion
      ),
      NOW()
    FROM contratos c
    LEFT JOIN adjudicaciones a ON a.id = c.adjudicacion_id
    LEFT JOIN licitaciones l ON l.id = a.licitacion_id
    WHERE c.valor IS NOT NULL
    AND c.valor::numeric > 500000
    AND (l.metodo_adquisicion = 'direct' OR l.metodo_adquisicion IS NULL)
    RETURNING id
  `);
  totalAlertas += r3.rows.length;
  console.log(`    ${r3.rows.length} alertas`);

  // REGLA 4: Mismo proveedor gana multiples contratos en corto tiempo
  console.log("  Regla 4: Proveedor con multiples adjudicaciones rapidas...");
  const r4 = await database.execute(sql`
    INSERT INTO alertas (id, tipo, severidad, descripcion, entidad_tipo, entidad_id, datos, detectado_en)
    SELECT
      gen_random_uuid(),
      'adjudicaciones_rapidas',
      'baja',
      p.nombre || ' gano ' || num_contratos || ' contratos en la misma institucion',
      'proveedor',
      p.id,
      jsonb_build_object(
        'proveedor_nombre', p.nombre,
        'institucion_id', sub.institucion_id,
        'num_contratos', sub.num_contratos,
        'monto_total', sub.monto_total
      ),
      NOW()
    FROM (
      SELECT
        cp.proveedor_id,
        c.institucion_id,
        COUNT(*)::int as num_contratos,
        SUM(c.valor::numeric) as monto_total
      FROM contrato_proveedores cp
      JOIN contratos c ON c.id = cp.contrato_id
      WHERE c.institucion_id IS NOT NULL AND c.valor IS NOT NULL
      GROUP BY cp.proveedor_id, c.institucion_id
      HAVING COUNT(*) >= 5
    ) sub
    JOIN proveedores p ON p.id = sub.proveedor_id
    RETURNING id
  `);
  totalAlertas += r4.rows.length;
  console.log(`    ${r4.rows.length} alertas`);

  console.log(`  Total red flags detectadas: ${totalAlertas}`);
}
