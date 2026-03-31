import type { Release } from "@compras-rd/ocds";

const BASE_URL = "https://datosabiertos.dgcp.gob.do/api-dgcp/v1";
const DELAY_MS = 1000;
const BATCH_CONCURRENCY = 2;
const MAX_RETRIES = 3;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface OpcionesFetch {
  anio?: number;
  fechaInicio?: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD
  limite?: number;
  pagina?: number;
  unidadCompra?: string;
}

interface RespuestaListado {
  code: number;
  hasError: boolean;
  payload: {
    content: Array<{ ocid: string; url: string }>;
  };
  page: number;
  limit: number;
  totalResults: number;
  pages: number;
}

interface RespuestaRelease {
  releases: Release[];
}

/**
 * Lista OCIDs desde /ocds/releases/all (paginado)
 */
async function listarOcids(opciones: OpcionesFetch = {}): Promise<{
  ocids: string[];
  totalPaginas: number;
  totalResultados: number;
}> {
  const {
    anio,
    fechaInicio,
    fechaFin,
    limite = 100,
    pagina = 1,
    unidadCompra,
  } = opciones;

  const params = new URLSearchParams();
  params.set("limit", String(limite));
  params.set("page", String(pagina));
  if (anio) params.set("year", String(anio));
  if (fechaInicio) params.set("start_date", fechaInicio);
  if (fechaFin) params.set("end_date", fechaFin);
  if (unidadCompra) params.set("uc", unidadCompra);

  const url = `${BASE_URL}/ocds/releases/all?${params.toString()}`;

  const respuesta = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ComprasTecnologiaRD/1.0",
    },
  });

  if (!respuesta.ok) {
    throw new Error(`Error API DGCP: ${respuesta.status} - ${url}`);
  }

  const datos: RespuestaListado = await respuesta.json();

  return {
    ocids: datos.payload.content.map((item) => item.ocid),
    totalPaginas: datos.pages,
    totalResultados: datos.totalResults,
  };
}

/**
 * Obtiene un release completo por OCID con retry y backoff
 */
export async function obtenerReleasePorOcid(
  ocid: string
): Promise<Release | null> {
  const url = `${BASE_URL}/ocds/releases?ocid=${encodeURIComponent(ocid)}`;

  for (let intento = 0; intento < MAX_RETRIES; intento++) {
    const respuesta = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ComprasTecnologiaRD/1.0",
      },
    });

    if (respuesta.ok) {
      const datos: RespuestaRelease = await respuesta.json();
      return datos.releases?.[0] ?? null;
    }

    if (respuesta.status === 404) return null;

    if (respuesta.status === 429) {
      const waitMs = DELAY_MS * Math.pow(2, intento + 1);
      console.warn(`  Rate limited, esperando ${waitMs}ms (intento ${intento + 1}/${MAX_RETRIES})`);
      await esperar(waitMs);
      continue;
    }

    throw new Error(`Error API DGCP release: ${respuesta.status} - ${url}`);
  }

  console.warn(`  Max retries alcanzado para: ${ocid}`);
  return null;
}

/**
 * Obtiene multiples releases con concurrencia limitada y rate limiting
 */
async function obtenerReleasesBatch(
  ocids: string[]
): Promise<Release[]> {
  const releases: Release[] = [];

  for (let i = 0; i < ocids.length; i += BATCH_CONCURRENCY) {
    const batch = ocids.slice(i, i + BATCH_CONCURRENCY);
    const resultados = await Promise.allSettled(
      batch.map((ocid) => obtenerReleasePorOcid(ocid))
    );

    for (const resultado of resultados) {
      if (resultado.status === "fulfilled" && resultado.value) {
        releases.push(resultado.value);
      } else if (resultado.status === "rejected") {
        console.warn(`  Error obteniendo release: ${resultado.reason}`);
      }
    }

    // Siempre esperar entre batches para respetar rate limits
    await esperar(DELAY_MS);
  }

  return releases;
}

/**
 * Itera sobre todas las paginas de releases OCDS
 * Paso 1: listar OCIDs, Paso 2: fetch completo por OCID
 */
export async function* iterarReleases(
  opciones: OpcionesFetch = {}
): AsyncGenerator<Release[], void, unknown> {
  const { limite = 50, ...resto } = opciones;
  let pagina = opciones.pagina ?? 1;
  let totalObtenidos = 0;

  // Primer request para saber total
  const primerListado = await listarOcids({ ...resto, limite, pagina });
  console.log(`  Total releases disponibles: ${primerListado.totalResultados}`);
  console.log(`  Total paginas: ${primerListado.totalPaginas}`);

  // Procesar primera pagina
  if (primerListado.ocids.length > 0) {
    const releases = await obtenerReleasesBatch(primerListado.ocids);
    if (releases.length > 0) {
      yield releases;
      totalObtenidos += releases.length;
      console.log(
        `  Pagina ${pagina}/${primerListado.totalPaginas}: ${releases.length} releases`
      );
    }
  }

  // Continuar con siguientes paginas
  while (pagina < primerListado.totalPaginas) {
    pagina++;
    await esperar(DELAY_MS);

    const listado = await listarOcids({ ...resto, limite, pagina });

    if (listado.ocids.length === 0) break;

    const releases = await obtenerReleasesBatch(listado.ocids);
    if (releases.length > 0) {
      yield releases;
      totalObtenidos += releases.length;
      console.log(
        `  Pagina ${pagina}/${primerListado.totalPaginas}: ${releases.length} releases (total: ${totalObtenidos})`
      );
    }
  }
}
