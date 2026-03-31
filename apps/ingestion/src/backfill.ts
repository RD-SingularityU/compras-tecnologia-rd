import { config } from "dotenv";
config({ path: "../../.env.local" });

import { descargarTodosLosAnios, descargarBulkPorAnio } from "./sources/ocds-bulk";
import { normalizarReleases } from "./transformers/ocds-normalizer";
import {
  cargarDatos,
  registrarIngestion,
  limpiarCaches,
} from "./loaders/db-loader";
import { construirGrafo } from "./transformers/graph-builder";
import { calcularHhi } from "./analytics/hhi-calculator";
import { detectarRedFlags } from "./analytics/red-flags";

async function backfill() {
  const inicio = new Date();
  const args = process.argv.slice(2);

  const anioArg = args.find((a) => a.startsWith("--anio="));
  const sinFiltro = args.includes("--todo"); // Sin filtro de tecnologia
  const soloAnalytics = args.includes("--analytics"); // Solo ejecutar analytics
  const anio = anioArg ? parseInt(anioArg.split("=")[1]) : undefined;

  if (soloAnalytics) {
    console.log("=== Solo ejecutando analytics ===");
    await construirGrafo();
    await calcularHhi();
    await detectarRedFlags();
    console.log("=== Analytics completado ===");
    return;
  }

  console.log("=== Backfill OCDS Bulk ===");
  console.log(`  Fecha: ${inicio.toISOString()}`);
  console.log(`  Modo: ${anio ? `año ${anio}` : "todos los años (2016-2026)"}`);
  console.log(`  Filtro tecnologia: ${sinFiltro ? "NO" : "SI"}`);

  let totalProcesados = 0;
  let totalNuevos = 0;
  let totalBatches = 0;

  limpiarCaches();

  try {
    const generador = anio
      ? descargarBulkPorAnio(anio, !sinFiltro)
      : descargarTodosLosAnios(undefined, !sinFiltro);

    for await (const batchReleases of generador) {
      totalBatches++;
      console.log(
        `\n  Batch ${totalBatches}: ${batchReleases.length} releases tech`
      );

      // Normalizar
      const datosNormalizados = normalizarReleases(batchReleases);
      console.log(
        `    ${datosNormalizados.instituciones.length} inst, ` +
          `${datosNormalizados.proveedores.length} prov, ` +
          `${datosNormalizados.contratos.length} contratos`
      );

      // Cargar a DB
      const { nuevos } = await cargarDatos(datosNormalizados);
      totalProcesados += batchReleases.length;
      totalNuevos += nuevos;

      console.log(
        `    Nuevos: ${nuevos} | Total procesados: ${totalProcesados}`
      );

      // Limpiar caches periodicamente para no usar demasiada memoria
      if (totalBatches % 50 === 0) {
        limpiarCaches();
        console.log("    (Cache limpiado)");
      }
    }

    // Post-procesamiento
    console.log("\n=== Post-procesamiento ===");

    console.log("  Construyendo grafo...");
    await construirGrafo();

    console.log("  Calculando HHI...");
    await calcularHhi();

    console.log("  Detectando red flags...");
    await detectarRedFlags();

    // Log
    await registrarIngestion("bulk_backfill", "completado", {
      registrosProcesados: totalProcesados,
      registrosNuevos: totalNuevos,
      inicio,
    });

    const duracion = ((Date.now() - inicio.getTime()) / 1000).toFixed(1);
    console.log("\n=== Backfill completado ===");
    console.log(`  Procesados: ${totalProcesados}`);
    console.log(`  Nuevos: ${totalNuevos}`);
    console.log(`  Batches: ${totalBatches}`);
    console.log(`  Duracion: ${duracion}s`);
  } catch (error) {
    console.error("\n=== Error en backfill ===", error);

    await registrarIngestion("bulk_backfill", "error", {
      registrosProcesados: totalProcesados,
      registrosNuevos: totalNuevos,
      errorDetalle: error instanceof Error ? error.message : String(error),
      inicio,
    });

    throw error;
  }
}

backfill().catch((error) => {
  console.error(error);
  process.exit(1);
});
