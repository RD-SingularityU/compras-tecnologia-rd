import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const alertas = pgTable(
  "alertas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: text("tipo").notNull(),
    severidad: text("severidad"),
    descripcion: text("descripcion"),
    entidadTipo: text("entidad_tipo"),
    entidadId: uuid("entidad_id"),
    datos: jsonb("datos"),
    detectadoEn: timestamp("detectado_en", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => [
    index("alertas_tipo_idx").on(table.tipo),
    index("alertas_severidad_idx").on(table.severidad),
    index("alertas_fecha_idx").on(table.detectadoEn),
  ]
);
