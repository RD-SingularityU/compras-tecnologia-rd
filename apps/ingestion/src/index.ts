import { config } from "dotenv";
config({ path: "../../.env.local" });

import { iterarReleases } from "./sources/dgcp-api";
import { normalizarReleases } from "./transformers/ocds-normalizer";
import {
  cargarDatos,
  registrarIngestion,
  limpiarCaches,
} from "./loaders/db-loader";
import { construirGrafo } from "./transformers/graph-builder";

/**
 * Pipeline principal de ingesta
 * Modo incremental: obtiene releases recientes (ultimos N dias)
 */
export async function ejecutarIngesta(opciones?: {
  diasAtras?: number;
  anio?: number;
}) {
  const { diasAtras = 1, anio } = opciones ?? {};
  const inicio = new Date();
  const fuente = "dgcp_api";

  console.log("=== Iniciando pipeline de ingesta OCDS ===");
  console.log(`  Fecha: ${inicio.toISOString()}`);

  let totalProcesados = 0;
  let totalNuevos = 0;

  try {
    limpiarCaches();

    // Calcular fecha "desde" para ingesta incremental
    const desde = new Date();
    desde.setDate(desde.getDate() - diasAtras);

    console.log(
      `  Modo: ${anio ? `anio ${anio}` : `incremental (ultimos ${diasAtras} dias)`}`
    );

    const opcionesFetch = anio
      ? { anio }
      : { fechaInicio: desde.toISOString().split("T")[0] };

    for await (const loteReleases of iterarReleases(opcionesFetch)) {
      console.log(`\n  Procesando lote de ${loteReleases.length} releases...`);

      // Normalizar
      const datosNormalizados = normalizarReleases(loteReleases);
      console.log(
        `    ${datosNormalizados.instituciones.length} instituciones, ` +
          `${datosNormalizados.proveedores.length} proveedores, ` +
          `${datosNormalizados.contratos.length} contratos`
      );

      // Cargar a DB
      const { nuevos } = await cargarDatos(datosNormalizados);
      totalProcesados += loteReleases.length;
      totalNuevos += nuevos;

      console.log(
        `    Cargados: ${nuevos} nuevos (total: ${totalProcesados} procesados)`
      );
    }

    // Reconstruir grafo
    console.log("\n  Reconstruyendo grafo...");
    await construirGrafo();

    // Registrar exito
    await registrarIngestion(fuente, "completado", {
      registrosProcesados: totalProcesados,
      registrosNuevos: totalNuevos,
      inicio,
    });

    console.log("\n=== Ingesta completada ===");
    console.log(`  Procesados: ${totalProcesados}`);
    console.log(`  Nuevos: ${totalNuevos}`);
    console.log(
      `  Duracion: ${((Date.now() - inicio.getTime()) / 1000).toFixed(1)}s`
    );
  } catch (error) {
    console.error("\n=== Error en ingesta ===", error);

    await registrarIngestion(fuente, "error", {
      registrosProcesados: totalProcesados,
      registrosNuevos: totalNuevos,
      errorDetalle: error instanceof Error ? error.message : String(error),
      inicio,
    });

    throw error;
  }
}

// Ejecutar si se corre directamente
const args = process.argv.slice(2);
const anio = args.find((a) => a.startsWith("--anio="));
const dias = args.find((a) => a.startsWith("--dias="));

ejecutarIngesta({
  anio: anio ? parseInt(anio.split("=")[1]) : undefined,
  diasAtras: dias ? parseInt(dias.split("=")[1]) : 1,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
