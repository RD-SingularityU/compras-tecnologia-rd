import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const ingestionLog = pgTable("ingestion_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  fuente: text("fuente").notNull(),
  estado: text("estado").notNull(),
  registrosProcesados: integer("registros_procesados"),
  registrosNuevos: integer("registros_nuevos"),
  registrosActualizados: integer("registros_actualizados"),
  errorDetalle: text("error_detalle"),
  inicio: timestamp("inicio", { withTimezone: true }).defaultNow(),
  fin: timestamp("fin", { withTimezone: true }),
});
