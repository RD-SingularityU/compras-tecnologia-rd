import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { licitaciones } from "./licitaciones.js";
import { proveedores } from "./proveedores.js";

export const adjudicaciones = pgTable("adjudicaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  ocdsId: text("ocds_id").notNull(),
  licitacionId: uuid("licitacion_id").references(() => licitaciones.id),
  titulo: text("titulo"),
  estado: text("estado"),
  fecha: timestamp("fecha", { withTimezone: true }),
  valor: numeric("valor", { precision: 18, scale: 2 }),
  moneda: text("moneda").default("DOP"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export const adjudicacionProveedores = pgTable(
  "adjudicacion_proveedores",
  {
    adjudicacionId: uuid("adjudicacion_id")
      .notNull()
      .references(() => adjudicaciones.id),
    proveedorId: uuid("proveedor_id")
      .notNull()
      .references(() => proveedores.id),
  },
  (table) => [
    primaryKey({ columns: [table.adjudicacionId, table.proveedorId] }),
  ]
);
