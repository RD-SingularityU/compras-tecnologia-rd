import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const proveedores = pgTable(
  "proveedores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ocdsId: text("ocds_id").unique(),
    nombre: text("nombre").notNull(),
    rnc: text("rnc"),
    direccion: jsonb("direccion"),
    contacto: jsonb("contacto"),
    totalContratos: integer("total_contratos").default(0),
    montoTotal: numeric("monto_total", { precision: 18, scale: 2 }).default(
      "0"
    ),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
    actualizadoEn: timestamp("actualizado_en", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => [
    index("proveedores_rnc_idx").on(table.rnc),
    index("proveedores_nombre_idx").on(table.nombre),
  ]
);
