import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable, Transform } from "stream";
import type { Release } from "@compras-rd/ocds";

const BASE_URL = "https://data.open-contracting.org/en/publication/22/download";

// Segmentos UNSPSC de tecnologia
const SEGMENTOS_TECNOLOGIA = [
  "43", // Difusion de tecnologias de informacion y telecomunicaciones
  "81", // Servicios basados en ingenieria, investigacion y tecnologia (incluye IT services)
];

// Familias especificas dentro de otros segmentos que son tech-related
const FAMILIAS_TECNOLOGIA = [
  "8111", // Servicios informaticos
  "8116", // Servicios de telecomunicaciones
];

/**
 * Verifica si un release tiene items clasificados como tecnologia
 * Busca en tender.items[].classification.id por codigos UNSPSC del segmento 43
 */
export function esTecnologia(release: Release): boolean {
  const items = (release.tender as Record<string, unknown>)?.items as
    | Array<{
        classification?: { id?: string; scheme?: string; description?: string };
        additionalClassifications?: Array<{
          id?: string;
          scheme?: string;
          description?: string;
        }>;
      }>
    | undefined;

  if (!items || items.length === 0) {
    // Si no tiene items clasificados, verificar por descripcion
    const titulo = (
      release.tender?.title ??
      release.contracts?.[0]?.title ??
      ""
    ).toLowerCase();
    const desc = (
      release.tender?.description ??
      release.contracts?.[0]?.description ??
      ""
    ).toLowerCase();
    const texto = titulo + " " + desc;

    const palabrasClave = [
      "software",
      "hardware",
      "computador",
      "servidor",
      "laptop",
      "impresora",
      "telecomunicacion",
      "internet",
      "red de datos",
      "fibra optica",
      "sistema de informacion",
      "informatica",
      "tecnologia",
      "cableado estructurado",
      "data center",
      "cloud",
      "ciberseguridad",
      "licencia de software",
      "soporte tecnico",
      "web",
      "aplicacion",
      "base de datos",
      "ups",
      "switch",
      "router",
      "firewall",
    ];

    return palabrasClave.some((palabra) => texto.includes(palabra));
  }

  for (const item of items) {
    const classId = item.classification?.id ?? "";

    // Verificar si pertenece a segmento de tecnologia
    for (const seg of SEGMENTOS_TECNOLOGIA) {
      if (classId.startsWith(seg)) return true;
    }

    // Verificar familias especificas
    for (const fam of FAMILIAS_TECNOLOGIA) {
      if (classId.startsWith(fam)) return true;
    }

    // Tambien verificar clasificaciones adicionales
    if (item.additionalClassifications) {
      for (const addl of item.additionalClassifications) {
        const addlId = addl.id ?? "";
        for (const seg of SEGMENTOS_TECNOLOGIA) {
          if (addlId.startsWith(seg)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Descarga y procesa archivo JSONL gzipped por año
 * Procesa en streaming para manejar archivos grandes (hasta 63MB comprimidos)
 * Filtra solo releases de tecnologia
 */
export async function* descargarBulkPorAnio(
  anio: number,
  filtrarTecnologia = true
): AsyncGenerator<Release[], void, unknown> {
  const url = `${BASE_URL}?name=${anio}.jsonl.gz`;
  console.log(`Descargando bulk ${anio} desde: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error descargando bulk ${anio}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`  Descargado: ${(buffer.length / 1024 / 1024).toFixed(1)}MB comprimido`);

  // Descomprimir y parsear linea por linea
  const releases: Release[] = [];
  let totalLineas = 0;
  let totalTech = 0;
  const BATCH_SIZE = 100;

  const gunzipStream = createGunzip();
  const inputStream = Readable.from(buffer);

  let residuo = "";

  const lineParser = new Transform({
    readableObjectMode: true,
    transform(chunk, _encoding, callback) {
      residuo += chunk.toString();
      const lineas = residuo.split("\n");
      residuo = lineas.pop() ?? "";

      for (const linea of lineas) {
        if (linea.trim()) {
          this.push(linea);
        }
      }
      callback();
    },
    flush(callback) {
      if (residuo.trim()) {
        this.push(residuo);
      }
      callback();
    },
  });

  const processStream = new Transform({
    objectMode: true,
    transform(linea: string, _encoding, callback) {
      try {
        const datos = JSON.parse(linea);
        // Cada linea puede ser un release package o un release individual
        const releasesList: Release[] = datos.releases ?? [datos];
        for (const release of releasesList) {
          if (release.ocid) {
            this.push(release);
          }
        }
      } catch {
        // Linea invalida, saltar
      }
      callback();
    },
  });

  // Pipeline: buffer -> gunzip -> lineas -> parse
  const processingPromise = pipeline(
    inputStream,
    gunzipStream,
    lineParser,
    processStream
  );

  // Consumir el stream y emitir en batches
  for await (const release of processStream) {
    totalLineas++;

    if (filtrarTecnologia && !esTecnologia(release as Release)) {
      continue;
    }

    totalTech++;
    releases.push(release as Release);

    if (releases.length >= BATCH_SIZE) {
      yield [...releases];
      releases.length = 0;
    }

    if (totalLineas % 10000 === 0) {
      console.log(
        `  Procesadas ${totalLineas} lineas, ${totalTech} tech (${((totalTech / totalLineas) * 100).toFixed(1)}%)`
      );
    }
  }

  await processingPromise.catch(() => {
    // Pipeline ya termino, ignorar error
  });

  // Emitir ultimo batch
  if (releases.length > 0) {
    yield releases;
  }

  console.log(
    `  ${anio}: ${totalLineas} total, ${totalTech} tecnologia (${((totalTech / totalLineas) * 100).toFixed(1)}%)`
  );
}

/**
 * Descarga datos de todos los años disponibles
 */
export async function* descargarTodosLosAnios(
  anios?: number[],
  filtrarTecnologia = true
): AsyncGenerator<Release[], void, unknown> {
  const aniosDefault = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const aniosADescargar = anios ?? aniosDefault;

  for (const anio of aniosADescargar) {
    console.log(`\n--- Procesando año ${anio} ---`);
    try {
      for await (const batch of descargarBulkPorAnio(anio, filtrarTecnologia)) {
        yield batch;
      }
    } catch (error) {
      console.error(`Error procesando ${anio}:`, error);
    }
  }
}
