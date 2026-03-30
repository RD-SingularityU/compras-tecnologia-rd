# Compras Tecnologia RD

## Idioma
Todo en espanol: UI, variables, nombres de tablas, comentarios, commits, documentacion.
Excepcion: keywords de TypeScript/SQL y nombres de librerias externas.

## Estructura
Monorepo con Turborepo:
- `apps/web` - Next.js 16 (App Router) - frontend principal
- `apps/ingestion` - Pipeline de ingesta de datos OCDS
- `packages/db` - Drizzle ORM schema y queries (Neon PostgreSQL)
- `packages/ocds` - Tipos TypeScript y validadores Zod para OCDS
- `packages/ui` - Componentes React compartidos

## Comandos
- `npm run dev` - Dev server (turbo)
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run type-check` - TypeScript check
- `cd packages/db && npm run db:push` - Push schema a Neon
- `cd packages/db && npm run db:studio` - Drizzle Studio

## Convenciones
- Nombres de archivos: kebab-case
- Componentes React: PascalCase
- Variables/funciones: camelCase en espanol (ej: `crearDb`, `obtenerContratos`)
- Tablas DB: snake_case en espanol (ej: `contrato_proveedores`)
- Schema DB definido en `packages/db/src/schema/`
- Tipos OCDS en `packages/ocds/src/types.ts`
- UI: shadcn/ui + Tailwind CSS, dark mode por defecto
- Fuente: Geist Sans / Geist Mono

## Datos
Fuente principal: DGCP API (datosabiertos.dgcp.gob.do) en formato OCDS.
Deduplicacion de proveedores por RNC (Registro Nacional Contribuyente).
Aristas del grafo pre-computadas en tabla `grafo_aristas`.

## Stack
Next.js 15+ | Drizzle ORM | Neon PostgreSQL | Sigma.js | Cytoscape.js | Recharts | Vercel AI SDK | Turborepo
