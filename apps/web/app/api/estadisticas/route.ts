import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/db";

export async function GET() {
  const result = await getDb().execute(sql`
    SELECT
      (SELECT COUNT(*) FROM contratos) as total_contratos,
      (SELECT COUNT(*) FROM proveedores) as total_proveedores,
      (SELECT COUNT(*) FROM instituciones) as total_instituciones,
      (SELECT COUNT(*) FROM licitaciones) as total_licitaciones,
      (SELECT COALESCE(SUM(valor::numeric), 0) FROM contratos) as monto_total,
      (SELECT COUNT(*) FROM grafo_aristas) as total_aristas
  `);

  return NextResponse.json(result.rows[0] ?? {});
}
