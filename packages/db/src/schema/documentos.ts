import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  ocdsId: text("ocds_id"),
  tipoEntidad: text("tipo_entidad"),
  entidadId: uuid("entidad_id"),
  titulo: text("titulo"),
  url: text("url"),
  formato: text("formato"),
  contenidoExtraido: text("contenido_extraido"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});
