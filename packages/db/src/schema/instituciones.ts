import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const instituciones = pgTable("instituciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  ocdsId: text("ocds_id").unique(),
  nombre: text("nombre").notNull(),
  rnc: text("rnc"),
  direccion: jsonb("direccion"),
  contacto: jsonb("contacto"),
  sector: text("sector"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow(),
});
