import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";
import { construirCondicionesFiltros } from "@/lib/construir-filtros-sql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "500"), 2000);
  const minContratos = parseInt(searchParams.get("min_contratos") ?? "1");
  const tipo = searchParams.get("tipo") ?? "contrato";
  const nodoId = searchParams.get("nodo_id");

  // Filtros globales
  const { condiciones } = construirCondicionesFiltros(searchParams, "grafo");

  // Filtros propios del grafo
  condiciones.push(`g.tipo_relacion = '${tipo}'`);
  condiciones.push(`g.num_contratos >= ${minContratos}`);
  if (nodoId) {
    condiciones.push(`(g.nodo_origen_id = '${nodoId}' OR g.nodo_destino_id = '${nodoId}')`);
  }

  const where = `WHERE ${condiciones.join(" AND ")}`;

  const aristas = await getDb().execute(sql.raw(`
    SELECT g.nodo_origen_tipo, g.nodo_origen_id,
           g.nodo_destino_tipo, g.nodo_destino_id,
           g.tipo_relacion, g.peso::float, g.num_contratos,
           CASE WHEN g.nodo_origen_tipo = 'institucion'
             THEN (SELECT nombre FROM instituciones WHERE id = g.nodo_origen_id)
             ELSE (SELECT nombre FROM proveedores WHERE id = g.nodo_origen_id)
           END as nombre_origen,
           CASE WHEN g.nodo_destino_tipo = 'institucion'
             THEN (SELECT nombre FROM instituciones WHERE id = g.nodo_destino_id)
             ELSE (SELECT nombre FROM proveedores WHERE id = g.nodo_destino_id)
           END as nombre_destino
    FROM grafo_aristas g
    ${where}
    ORDER BY g.num_contratos DESC
    LIMIT ${limite}
  `));

  // Construir nodos y aristas para el frontend
  const nodosMap = new Map<
    string,
    { id: string; tipo: string; nombre: string }
  >();
  const aristasOut: Array<{
    origen: string;
    destino: string;
    peso: number;
    numContratos: number;
  }> = [];

  for (const row of aristas.rows as Array<Record<string, unknown>>) {
    const origenId = row.nodo_origen_id as string;
    const destinoId = row.nodo_destino_id as string;

    if (!nodosMap.has(origenId)) {
      nodosMap.set(origenId, {
        id: origenId,
        tipo: row.nodo_origen_tipo as string,
        nombre: (row.nombre_origen as string) ?? "Desconocido",
      });
    }

    if (!nodosMap.has(destinoId)) {
      nodosMap.set(destinoId, {
        id: destinoId,
        tipo: row.nodo_destino_tipo as string,
        nombre: (row.nombre_destino as string) ?? "Desconocido",
      });
    }

    aristasOut.push({
      origen: origenId,
      destino: destinoId,
      peso: row.peso as number,
      numContratos: row.num_contratos as number,
    });
  }

  return NextResponse.json({
    nodos: Array.from(nodosMap.values()),
    aristas: aristasOut,
  });
}
