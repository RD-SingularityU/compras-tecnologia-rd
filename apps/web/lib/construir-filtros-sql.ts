// Helper compartido para construir condiciones SQL desde filtros globales
// Usado por todas las API routes

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function escapar(valor: string): string {
  return valor.replace(/'/g, "''");
}

function validarUuid(valor: string): boolean {
  return UUID_REGEX.test(valor);
}

function validarFecha(valor: string): boolean {
  return FECHA_REGEX.test(valor);
}

function validarMonto(valor: string): number | null {
  const num = parseFloat(valor);
  return isNaN(num) ? null : num;
}

type Contexto =
  | "contratos"
  | "instituciones"
  | "proveedores"
  | "estadisticas"
  | "concentracion"
  | "alertas"
  | "grafo";

interface ResultadoFiltros {
  condiciones: string[];
  joinsExtra: string[];
}

export function construirCondicionesFiltros(
  searchParams: URLSearchParams,
  contexto: Contexto
): ResultadoFiltros {
  const fechaDesde = searchParams.get("fecha_desde");
  const fechaHasta = searchParams.get("fecha_hasta");
  const sector = searchParams.get("sector");
  const metodoAdquisicion = searchParams.get("metodo_adquisicion");
  const institucionId = searchParams.get("institucion_id");
  const montoMin = searchParams.get("monto_min");
  const montoMax = searchParams.get("monto_max");

  switch (contexto) {
    case "contratos":
      return filtrosContratos({ fechaDesde, fechaHasta, sector, metodoAdquisicion, institucionId, montoMin, montoMax });
    case "instituciones":
      return filtrosInstituciones({ fechaDesde, fechaHasta, sector, montoMin, montoMax });
    case "proveedores":
      return filtrosProveedores({ fechaDesde, fechaHasta, sector, institucionId, montoMin, montoMax });
    case "estadisticas":
      return filtrosEstadisticas({ fechaDesde, fechaHasta, sector, institucionId, montoMin, montoMax });
    case "concentracion":
      return filtrosConcentracion({ sector, institucionId });
    case "alertas":
      return filtrosAlertas({ fechaDesde, fechaHasta, sector, institucionId });
    case "grafo":
      return filtrosGrafo({ sector, institucionId });
    default:
      return { condiciones: [], joinsExtra: [] };
  }
}

// --- Contratos: filtros directos + JOIN para metodo_adquisicion ---

function filtrosContratos(params: {
  fechaDesde: string | null;
  fechaHasta: string | null;
  sector: string | null;
  metodoAdquisicion: string | null;
  institucionId: string | null;
  montoMin: string | null;
  montoMax: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];
  const joinsExtra: string[] = [];

  if (params.fechaDesde && validarFecha(params.fechaDesde)) {
    condiciones.push(`c.fecha_firma >= '${params.fechaDesde}'::timestamptz`);
  }
  if (params.fechaHasta && validarFecha(params.fechaHasta)) {
    condiciones.push(`c.fecha_firma <= '${params.fechaHasta}T23:59:59'::timestamptz`);
  }
  if (params.sector) {
    condiciones.push(`i.sector = '${escapar(params.sector)}'`);
  }
  if (params.institucionId && validarUuid(params.institucionId)) {
    condiciones.push(`c.institucion_id = '${params.institucionId}'`);
  }
  if (params.montoMin) {
    const num = validarMonto(params.montoMin);
    if (num !== null) condiciones.push(`c.valor::numeric >= ${num}`);
  }
  if (params.montoMax) {
    const num = validarMonto(params.montoMax);
    if (num !== null) condiciones.push(`c.valor::numeric <= ${num}`);
  }
  if (params.metodoAdquisicion) {
    joinsExtra.push(`LEFT JOIN adjudicaciones adj ON adj.id = c.adjudicacion_id`);
    joinsExtra.push(`LEFT JOIN licitaciones lic ON lic.id = adj.licitacion_id`);
    condiciones.push(`lic.metodo_adquisicion = '${escapar(params.metodoAdquisicion)}'`);
  }

  return { condiciones, joinsExtra };
}

// --- Instituciones: sector directo, fecha/monto via EXISTS ---

function filtrosInstituciones(params: {
  fechaDesde: string | null;
  fechaHasta: string | null;
  sector: string | null;
  montoMin: string | null;
  montoMax: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];

  if (params.sector) {
    condiciones.push(`i.sector = '${escapar(params.sector)}'`);
  }

  // Condiciones sobre contratos via EXISTS
  const subCondiciones: string[] = [];
  if (params.fechaDesde && validarFecha(params.fechaDesde)) {
    subCondiciones.push(`csub.fecha_firma >= '${params.fechaDesde}'::timestamptz`);
  }
  if (params.fechaHasta && validarFecha(params.fechaHasta)) {
    subCondiciones.push(`csub.fecha_firma <= '${params.fechaHasta}T23:59:59'::timestamptz`);
  }
  if (params.montoMin) {
    const num = validarMonto(params.montoMin);
    if (num !== null) subCondiciones.push(`csub.valor::numeric >= ${num}`);
  }
  if (params.montoMax) {
    const num = validarMonto(params.montoMax);
    if (num !== null) subCondiciones.push(`csub.valor::numeric <= ${num}`);
  }

  if (subCondiciones.length > 0) {
    condiciones.push(
      `EXISTS (SELECT 1 FROM contratos csub WHERE csub.institucion_id = i.id AND ${subCondiciones.join(" AND ")})`
    );
  }

  return { condiciones, joinsExtra: [] };
}

// --- Proveedores: todo via EXISTS ---

function filtrosProveedores(params: {
  fechaDesde: string | null;
  fechaHasta: string | null;
  sector: string | null;
  institucionId: string | null;
  montoMin: string | null;
  montoMax: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];
  const subCondiciones: string[] = [];
  let necesitaInstitucion = false;

  if (params.fechaDesde && validarFecha(params.fechaDesde)) {
    subCondiciones.push(`csub.fecha_firma >= '${params.fechaDesde}'::timestamptz`);
  }
  if (params.fechaHasta && validarFecha(params.fechaHasta)) {
    subCondiciones.push(`csub.fecha_firma <= '${params.fechaHasta}T23:59:59'::timestamptz`);
  }
  if (params.montoMin) {
    const num = validarMonto(params.montoMin);
    if (num !== null) subCondiciones.push(`csub.valor::numeric >= ${num}`);
  }
  if (params.montoMax) {
    const num = validarMonto(params.montoMax);
    if (num !== null) subCondiciones.push(`csub.valor::numeric <= ${num}`);
  }
  if (params.institucionId && validarUuid(params.institucionId)) {
    subCondiciones.push(`csub.institucion_id = '${params.institucionId}'`);
  }
  if (params.sector) {
    necesitaInstitucion = true;
    subCondiciones.push(`isub.sector = '${escapar(params.sector)}'`);
  }

  if (subCondiciones.length > 0) {
    const joinInstitucion = necesitaInstitucion
      ? `JOIN instituciones isub ON isub.id = csub.institucion_id`
      : "";
    condiciones.push(
      `EXISTS (SELECT 1 FROM contrato_proveedores cpsub JOIN contratos csub ON csub.id = cpsub.contrato_id ${joinInstitucion} WHERE cpsub.proveedor_id = p.id AND ${subCondiciones.join(" AND ")})`
    );
  }

  return { condiciones, joinsExtra: [] };
}

// --- Estadisticas: retorna condiciones para subqueries del dashboard ---

function filtrosEstadisticas(params: {
  fechaDesde: string | null;
  fechaHasta: string | null;
  sector: string | null;
  institucionId: string | null;
  montoMin: string | null;
  montoMax: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];
  let necesitaInstitucion = false;

  if (params.fechaDesde && validarFecha(params.fechaDesde)) {
    condiciones.push(`c.fecha_firma >= '${params.fechaDesde}'::timestamptz`);
  }
  if (params.fechaHasta && validarFecha(params.fechaHasta)) {
    condiciones.push(`c.fecha_firma <= '${params.fechaHasta}T23:59:59'::timestamptz`);
  }
  if (params.institucionId && validarUuid(params.institucionId)) {
    condiciones.push(`c.institucion_id = '${params.institucionId}'`);
  }
  if (params.montoMin) {
    const num = validarMonto(params.montoMin);
    if (num !== null) condiciones.push(`c.valor::numeric >= ${num}`);
  }
  if (params.montoMax) {
    const num = validarMonto(params.montoMax);
    if (num !== null) condiciones.push(`c.valor::numeric <= ${num}`);
  }
  if (params.sector) {
    necesitaInstitucion = true;
    condiciones.push(`i.sector = '${escapar(params.sector)}'`);
  }

  const joinsExtra = necesitaInstitucion
    ? ["JOIN instituciones i ON i.id = c.institucion_id"]
    : [];

  return { condiciones, joinsExtra };
}

// --- Concentracion: sector e institucion directos ---

function filtrosConcentracion(params: {
  sector: string | null;
  institucionId: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];

  if (params.sector) {
    condiciones.push(`i.sector = '${escapar(params.sector)}'`);
  }
  if (params.institucionId && validarUuid(params.institucionId)) {
    condiciones.push(`h.institucion_id = '${params.institucionId}'`);
  }

  return { condiciones, joinsExtra: [] };
}

// --- Alertas: fecha en detectado_en, sector/institucion via subquery ---

function filtrosAlertas(params: {
  fechaDesde: string | null;
  fechaHasta: string | null;
  sector: string | null;
  institucionId: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];

  if (params.fechaDesde && validarFecha(params.fechaDesde)) {
    condiciones.push(`a.detectado_en >= '${params.fechaDesde}'::timestamptz`);
  }
  if (params.fechaHasta && validarFecha(params.fechaHasta)) {
    condiciones.push(`a.detectado_en <= '${params.fechaHasta}T23:59:59'::timestamptz`);
  }
  if (params.institucionId && validarUuid(params.institucionId)) {
    condiciones.push(
      `((a.entidad_tipo = 'institucion' AND a.entidad_id = '${params.institucionId}') OR (a.entidad_tipo = 'proveedor' AND EXISTS (SELECT 1 FROM contrato_proveedores cp JOIN contratos c ON c.id = cp.contrato_id WHERE cp.proveedor_id = a.entidad_id AND c.institucion_id = '${params.institucionId}')))`
    );
  }
  if (params.sector) {
    condiciones.push(
      `((a.entidad_tipo = 'institucion' AND a.entidad_id IN (SELECT id FROM instituciones WHERE sector = '${escapar(params.sector)}')) OR (a.entidad_tipo = 'proveedor' AND a.entidad_id IN (SELECT cp.proveedor_id FROM contrato_proveedores cp JOIN contratos c ON c.id = cp.contrato_id JOIN instituciones i ON i.id = c.institucion_id WHERE i.sector = '${escapar(params.sector)}')))`
    );
  }

  return { condiciones, joinsExtra: [] };
}

// --- Grafo: sector e institucion via subquery en nodos ---

function filtrosGrafo(params: {
  sector: string | null;
  institucionId: string | null;
}): ResultadoFiltros {
  const condiciones: string[] = [];

  if (params.institucionId && validarUuid(params.institucionId)) {
    condiciones.push(
      `(g.nodo_origen_id = '${params.institucionId}' OR g.nodo_destino_id = '${params.institucionId}')`
    );
  }
  if (params.sector) {
    condiciones.push(
      `(
        (g.nodo_origen_tipo = 'institucion' AND g.nodo_origen_id IN (SELECT id FROM instituciones WHERE sector = '${escapar(params.sector)}'))
        OR
        (g.nodo_destino_tipo = 'institucion' AND g.nodo_destino_id IN (SELECT id FROM instituciones WHERE sector = '${escapar(params.sector)}'))
      )`
    );
  }

  return { condiciones, joinsExtra: [] };
}

// Helper para construir sub-condiciones de contratos (para subqueries en instituciones/proveedores)
export function construirSubCondicionesContratos(
  searchParams: URLSearchParams,
  aliasContrato: string = "csub"
): string {
  const fechaDesde = searchParams.get("fecha_desde");
  const fechaHasta = searchParams.get("fecha_hasta");
  const montoMin = searchParams.get("monto_min");
  const montoMax = searchParams.get("monto_max");

  const conds: string[] = [];

  if (fechaDesde && validarFecha(fechaDesde)) {
    conds.push(`${aliasContrato}.fecha_firma >= '${fechaDesde}'::timestamptz`);
  }
  if (fechaHasta && validarFecha(fechaHasta)) {
    conds.push(`${aliasContrato}.fecha_firma <= '${fechaHasta}T23:59:59'::timestamptz`);
  }
  if (montoMin) {
    const num = validarMonto(montoMin);
    if (num !== null) conds.push(`${aliasContrato}.valor::numeric >= ${num}`);
  }
  if (montoMax) {
    const num = validarMonto(montoMax);
    if (num !== null) conds.push(`${aliasContrato}.valor::numeric <= ${num}`);
  }

  return conds.length > 0 ? ` AND ${conds.join(" AND ")}` : "";
}
