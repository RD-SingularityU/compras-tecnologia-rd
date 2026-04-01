# Instalacion

## Requisitos

- Node.js 20+
- npm 10+
- Base de datos PostgreSQL (recomendado: [Neon](https://neon.tech))

## Configuracion

1. Clonar el repositorio:

```bash
git clone https://github.com/tu-usuario/compras-tecnologia-rd.git
cd compras-tecnologia-rd
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno. Crear `.env.local` en la raiz del proyecto:

```env
DATABASE_URL=postgresql://usuario:password@host/database?sslmode=require
```

Para Neon, obtener el connection string desde el dashboard de Neon.

4. Aplicar el schema a la base de datos:

```bash
cd packages/db
npm run db:push
```

5. Iniciar el servidor de desarrollo:

```bash
cd ../..
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Ingesta de datos

Para cargar datos desde la DGCP:

```bash
cd apps/ingestion
npm run start
```

Para backfill historico:

```bash
cd apps/ingestion
npm run backfill
```

Para ejecutar analisis (HHI, red flags, grafo):

```bash
cd apps/ingestion
npm run analytics
```

## Despliegue

La aplicacion esta configurada para desplegarse en [Vercel](https://vercel.com). Configurar la variable de entorno `DATABASE_URL` en el dashboard de Vercel.

## Drizzle Studio

Para explorar la base de datos visualmente:

```bash
cd packages/db
npm run db:studio
```
