# Compras Tecnologia RD

Plataforma de transparencia para contrataciones publicas de tecnologia en Republica Dominicana. Consume datos abiertos en formato OCDS de la DGCP (Direccion General de Contrataciones Publicas) y los presenta en dashboards interactivos con analisis de concentracion y deteccion de red flags.

## Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Recharts, Sigma.js
- **Backend**: API Routes de Next.js, Drizzle ORM
- **Base de datos**: Neon PostgreSQL
- **Ingesta**: Pipeline TypeScript para datos OCDS (API REST + bulk JSONL)
- **Monorepo**: Turborepo con npm workspaces

## Estructura

```
apps/
  web/          Next.js - frontend y API routes
  ingestion/    Pipeline de ingesta de datos OCDS
packages/
  db/           Drizzle ORM schema y queries (Neon PostgreSQL)
  ocds/         Tipos TypeScript y validadores Zod para OCDS
  ui/           Componentes React compartidos
```

## Funcionalidades

- **Dashboard** con estadisticas generales y graficos interactivos
- **Contratos** con busqueda, paginacion y sorting
- **Instituciones** y **Proveedores** con metricas agregadas
- **Red de contrataciones** (grafo interactivo con Sigma.js)
- **Analisis de concentracion** (indice HHI por institucion)
- **Red flags** automaticas (proveedor unico, concentracion excesiva, compra directa alto valor, adjudicaciones rapidas)
- **Filtros globales** en todas las paginas: periodo de tiempo, sector, tipo de contratacion, institucion, rango de monto

## Inicio rapido

Ver [INSTALL.md](INSTALL.md) para instrucciones de instalacion y configuracion.

```bash
npm install
npm run dev
```

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Dev server (turbo) |
| `npm run build` | Build todos los paquetes |
| `npm run lint` | Lint todos los paquetes |
| `npm run type-check` | Verificacion TypeScript |
| `cd packages/db && npm run db:push` | Push schema a Neon |
| `cd packages/db && npm run db:studio` | Drizzle Studio |

## Datos

Fuente: [Portal de Datos Abiertos DGCP](https://datosabiertos.dgcp.gob.do) en formato OCDS (Open Contracting Data Standard).

## Licencia

MIT
