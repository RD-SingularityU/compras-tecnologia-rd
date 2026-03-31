import { eq, sql } from "drizzle-orm";
import { crearDb, type Database } from "@compras-rd/db/src/client";
import {
  instituciones,
  proveedores,
  licitaciones,
  adjudicaciones,
  adjudicacionProveedores,
  contratos,
  contratoProveedores,
  ingestionLog,
} from "@compras-rd/db";
import type { DatosNormalizados } from "../transformers/ocds-normalizer";

// Cache de IDs: ocdsId -> UUID interno
const cacheInstitucionIds = new Map<string, string>();
const cacheProveedorIds = new Map<string, string>();
const cacheLicitacionIds = new Map<string, string>();
const cacheAdjudicacionIds = new Map<string, string>();
const cacheContratoIds = new Map<string, string>();

export function limpiarCaches() {
  cacheInstitucionIds.clear();
  cacheProveedorIds.clear();
  cacheLicitacionIds.clear();
  cacheAdjudicacionIds.clear();
  cacheContratoIds.clear();
}

/**
 * Carga datos normalizados en la base de datos
 * Usa upserts para ser idempotente
 */
export async function cargarDatos(
  datos: DatosNormalizados,
  db?: Database
): Promise<{ nuevos: number; actualizados: number }> {
  const database = db ?? crearDb();
  let nuevos = 0;
  let actualizados = 0;

  // 1. Upsert instituciones
  for (const inst of datos.instituciones) {
    const resultado = await database
      .insert(instituciones)
      .values({
        ocdsId: inst.ocdsId,
        nombre: inst.nombre,
        rnc: inst.rnc,
        direccion: inst.direccion,
        contacto: inst.contacto,
        sector: inst.sector,
      })
      .onConflictDoUpdate({
        target: instituciones.ocdsId,
        set: {
          nombre: inst.nombre,
          rnc: inst.rnc,
          direccion: inst.direccion,
          contacto: inst.contacto,
          actualizadoEn: new Date(),
        },
      })
      .returning({ id: instituciones.id });

    if (resultado[0]) {
      cacheInstitucionIds.set(inst.ocdsId, resultado[0].id);
    }
  }

  // 2. Upsert proveedores
  for (const prov of datos.proveedores) {
    const resultado = await database
      .insert(proveedores)
      .values({
        ocdsId: prov.ocdsId,
        nombre: prov.nombre,
        rnc: prov.rnc,
        direccion: prov.direccion,
        contacto: prov.contacto,
      })
      .onConflictDoUpdate({
        target: proveedores.ocdsId,
        set: {
          nombre: prov.nombre,
          rnc: prov.rnc,
          direccion: prov.direccion,
          contacto: prov.contacto,
          actualizadoEn: new Date(),
        },
      })
      .returning({ id: proveedores.id });

    if (resultado[0]) {
      cacheProveedorIds.set(prov.ocdsId, resultado[0].id);
    }
  }

  // Helper para resolver IDs
  async function resolverInstitucionId(
    ocdsId: string | null
  ): Promise<string | null> {
    if (!ocdsId) return null;
    if (cacheInstitucionIds.has(ocdsId)) return cacheInstitucionIds.get(ocdsId)!;
    const rows = await database
      .select({ id: instituciones.id })
      .from(instituciones)
      .where(eq(instituciones.ocdsId, ocdsId))
      .limit(1);
    if (rows[0]) {
      cacheInstitucionIds.set(ocdsId, rows[0].id);
      return rows[0].id;
    }
    return null;
  }

  async function resolverProveedorId(
    ocdsId: string
  ): Promise<string | null> {
    if (cacheProveedorIds.has(ocdsId)) return cacheProveedorIds.get(ocdsId)!;
    const rows = await database
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.ocdsId, ocdsId))
      .limit(1);
    if (rows[0]) {
      cacheProveedorIds.set(ocdsId, rows[0].id);
      return rows[0].id;
    }
    return null;
  }

  // 3. Upsert licitaciones
  for (const lic of datos.licitaciones) {
    const institucionId = await resolverInstitucionId(lic.ocdsIdInstitucion);

    const resultado = await database
      .insert(licitaciones)
      .values({
        ocdsId: lic.ocdsId,
        ocid: lic.ocid,
        titulo: lic.titulo,
        descripcion: lic.descripcion,
        estado: lic.estado,
        institucionId,
        metodoAdquisicion: lic.metodoAdquisicion,
        categoriaPrincipal: lic.categoriaPrincipal,
        valorEstimado: lic.valorEstimado,
        moneda: lic.moneda,
        periodoLicitacion: lic.periodoLicitacion,
        periodoAdjudicacion: lic.periodoAdjudicacion,
        numOferentes: lic.numOferentes,
        fechaPublicacion: lic.fechaPublicacion
          ? new Date(lic.fechaPublicacion)
          : null,
      })
      .onConflictDoNothing()
      .returning({ id: licitaciones.id });

    if (resultado[0]) {
      cacheLicitacionIds.set(lic.ocdsId, resultado[0].id);
      nuevos++;
    }
  }

  // 4. Upsert adjudicaciones
  for (const adj of datos.adjudicaciones) {
    // Resolver licitacion ID
    let licitacionId: string | null = null;
    if (adj.ocdsIdLicitacion) {
      if (cacheLicitacionIds.has(adj.ocdsIdLicitacion)) {
        licitacionId = cacheLicitacionIds.get(adj.ocdsIdLicitacion)!;
      } else {
        const rows = await database
          .select({ id: licitaciones.id })
          .from(licitaciones)
          .where(eq(licitaciones.ocdsId, adj.ocdsIdLicitacion))
          .limit(1);
        if (rows[0]) {
          cacheLicitacionIds.set(adj.ocdsIdLicitacion, rows[0].id);
          licitacionId = rows[0].id;
        }
      }
    }

    const resultado = await database
      .insert(adjudicaciones)
      .values({
        ocdsId: adj.ocdsId,
        licitacionId,
        titulo: adj.titulo,
        estado: adj.estado,
        fecha: adj.fecha ? new Date(adj.fecha) : null,
        valor: adj.valor,
        moneda: adj.moneda,
      })
      .onConflictDoNothing()
      .returning({ id: adjudicaciones.id });

    if (resultado[0]) {
      cacheAdjudicacionIds.set(adj.ocdsId, resultado[0].id);
    }
  }

  // 5. Vinculos adjudicacion-proveedor
  for (const vinculo of datos.vinculosAdjudicacion) {
    const adjId = cacheAdjudicacionIds.get(vinculo.ocdsIdAdjudicacion);
    const provId = await resolverProveedorId(vinculo.ocdsIdProveedor);

    if (adjId && provId) {
      await database
        .insert(adjudicacionProveedores)
        .values({
          adjudicacionId: adjId,
          proveedorId: provId,
        })
        .onConflictDoNothing();
    }
  }

  // 6. Upsert contratos
  for (const con of datos.contratos) {
    const adjId = con.ocdsIdAdjudicacion
      ? cacheAdjudicacionIds.get(con.ocdsIdAdjudicacion) ?? null
      : null;
    const institucionId = await resolverInstitucionId(con.ocdsIdInstitucion);

    const resultado = await database
      .insert(contratos)
      .values({
        ocdsId: con.ocdsId,
        ocid: con.ocid,
        adjudicacionId: adjId,
        institucionId,
        titulo: con.titulo,
        descripcion: con.descripcion,
        estado: con.estado,
        valor: con.valor,
        moneda: con.moneda,
        fechaFirma: con.fechaFirma ? new Date(con.fechaFirma) : null,
        periodoInicio: con.periodoInicio ? new Date(con.periodoInicio) : null,
        periodoFin: con.periodoFin ? new Date(con.periodoFin) : null,
      })
      .onConflictDoNothing()
      .returning({ id: contratos.id });

    if (resultado[0]) {
      cacheContratoIds.set(con.ocdsId, resultado[0].id);
      nuevos++;
    }
  }

  // 7. Vinculos contrato-proveedor
  for (const vinculo of datos.vinculosContrato) {
    const conId = cacheContratoIds.get(vinculo.ocdsIdContrato);
    const provId = await resolverProveedorId(vinculo.ocdsIdProveedor);

    if (conId && provId) {
      await database
        .insert(contratoProveedores)
        .values({
          contratoId: conId,
          proveedorId: provId,
        })
        .onConflictDoNothing();
    }
  }

  // 8. Actualizar contadores de proveedores
  await database.execute(sql`
    UPDATE proveedores p SET
      total_contratos = (
        SELECT COUNT(*) FROM contrato_proveedores cp WHERE cp.proveedor_id = p.id
      ),
      monto_total = (
        SELECT COALESCE(SUM(c.valor::numeric), 0)
        FROM contrato_proveedores cp
        JOIN contratos c ON c.id = cp.contrato_id
        WHERE cp.proveedor_id = p.id
      ),
      actualizado_en = NOW()
    WHERE p.id IN (
      SELECT DISTINCT proveedor_id FROM contrato_proveedores
    )
  `);

  return { nuevos, actualizados };
}

/**
 * Registra una ejecucion de ingesta en el log
 */
export async function registrarIngestion(
  fuente: string,
  estado: string,
  detalles: {
    registrosProcesados?: number;
    registrosNuevos?: number;
    registrosActualizados?: number;
    errorDetalle?: string;
    inicio: Date;
  },
  db?: Database
) {
  const database = db ?? crearDb();
  await database.insert(ingestionLog).values({
    fuente,
    estado,
    registrosProcesados: detalles.registrosProcesados ?? 0,
    registrosNuevos: detalles.registrosNuevos ?? 0,
    registrosActualizados: detalles.registrosActualizados ?? 0,
    errorDetalle: detalles.errorDetalle ?? null,
    inicio: detalles.inicio,
    fin: new Date(),
  });
}
