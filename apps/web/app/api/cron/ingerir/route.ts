import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verificar autorizacion del cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Import dinamico del pipeline de ingesta
    // En produccion esto se ejecutaria como un Vercel Function
    const { ejecutarIngesta } = await import("@compras-rd/ingestion/src/index");
    await ejecutarIngesta({ diasAtras: 1 });

    return NextResponse.json({
      ok: true,
      mensaje: "Ingesta incremental completada",
      fecha: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en cron de ingesta:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
