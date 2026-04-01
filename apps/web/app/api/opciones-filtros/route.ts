import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sectores, metodos, instituciones] = await Promise.all([
    getDb().execute(sql`
      SELECT DISTINCT sector FROM instituciones
      WHERE sector IS NOT NULL AND sector != ''
      ORDER BY sector
    `),
    getDb().execute(sql`
      SELECT DISTINCT metodo_adquisicion FROM licitaciones
      WHERE metodo_adquisicion IS NOT NULL AND metodo_adquisicion != ''
      ORDER BY metodo_adquisicion
    `),
    getDb().execute(sql`
      SELECT id, nombre FROM instituciones
      ORDER BY nombre
    `),
  ]);

  return NextResponse.json({
    sectores: (sectores.rows as Array<{ sector: string }>).map((r) => r.sector),
    metodos_adquisicion: (metodos.rows as Array<{ metodo_adquisicion: string }>).map(
      (r) => r.metodo_adquisicion
    ),
    instituciones: instituciones.rows as Array<{ id: string; nombre: string }>,
  });
}
