# Changelog

## 2026-03-31

### Filtros globales en todas las paginas

Nuevo sistema de filtros unificado aplicable a todas las consultas y reportes.

**Filtros disponibles:**
- Periodo de tiempo (fecha desde/hasta)
- Sector institucional
- Tipo de contratacion (metodo de adquisicion)
- Institucion
- Monto (rango minimo/maximo)

**Cambios:**
- Nuevo componente `BarraFiltrosGlobales` reutilizable con pills de filtros activos
- Nuevo hook `useFiltrosGlobales` que sincroniza filtros con URL (enlaces compartibles)
- Nuevo helper SQL `construirCondicionesFiltros` compartido por todas las API routes
- Nuevo endpoint `/api/opciones-filtros` que provee valores para los dropdowns
- Todas las API routes (`contratos`, `instituciones`, `proveedores`, `estadisticas`, `concentracion`, `alertas`, `grafo`) aceptan los filtros globales
- Todas las paginas integran la barra de filtros
- Indices nuevos en `instituciones.sector` y `licitaciones.metodo_adquisicion`

**Matriz de filtros por pagina:**

| Pagina | Periodo | Sector | Tipo | Institucion | Monto |
|--------|:-------:|:------:|:----:|:-----------:|:-----:|
| Contratos | x | x | x | x | x |
| Instituciones | x | x | | | x |
| Proveedores | x | x | | x | x |
| Alertas | x | x | | x | |
| Concentracion | | x | | x | |
| Dashboard | x | x | | x | |
| Red | | x | | x | |

## 2026-03-30

### Mejoras de interactividad

- Bar chart clickeable en dashboard (navega a contratos del proveedor)
- Sorting en todas las tablas (contratos, instituciones, proveedores)
- Fix: hydration error en contratos page
- Fix: filtro por proveedor desde URL no se aplicaba al primer fetch
- Fix: contratos page no cargaba datos (useEffect guard bug)
- Top proveedores clickeables + filtros interactivos en contratos

## 2026-03-29

### Ingesta bulk y backfill

- Bulk download JSONL desde DGCP
- Filtro de tecnologia en pipeline de ingesta
- Backfill streaming para datos historicos

### Fase 3: Analiticas

- Calculadora HHI (indice de concentracion de mercado)
- Deteccion automatica de red flags
- Paginas de detalle para instituciones y proveedores

### Fase 2: Frontend

- Dashboard con estadisticas y graficos
- Grafo de red de contrataciones (Sigma.js)
- Paginas de listado (contratos, instituciones, proveedores)
- Deploy a Vercel
