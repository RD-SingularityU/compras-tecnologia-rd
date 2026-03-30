import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { adjudicaciones } from "./adjudicaciones.js";
import { instituciones } from "./instituciones.js";
import { proveedores } from "./proveedores.js";

export const contratos = pgTable(
  "contratos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ocdsId: text("ocds_id").notNull(),
    ocid: text("ocid").notNull(),
    adjudicacionId: uuid("adjudicacion_id").references(
      () => adjudicaciones.id
    ),
    institucionId: uuid("institucion_id").references(() => instituciones.id),
    titulo: text("titulo"),
    descripcion: text("descripcion"),
    estado: text("estado"),
    valor: numeric("valor", { precision: 18, scale: 2 }),
    moneda: text("moneda").default("DOP"),
    fechaFirma: timestamp("fecha_firma", { withTimezone: true }),
    periodoInicio: timestamp("periodo_inicio", { withTimezone: true }),
    periodoFin: timestamp("periodo_fin", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
    actualizadoEn: timestamp("actualizado_en", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => [
    index("contratos_institucion_idx").on(table.institucionId),
    index("contratos_fecha_idx").on(table.fechaFirma),
    index("contratos_valor_idx").on(table.valor),
  ]
);

export const contratoProveedores = pgTable(
  "contrato_proveedores",
  {
    contratoId: uuid("contrato_id")
      .notNull()
      .references(() => contratos.id),
    proveedorId: uuid("proveedor_id")
      .notNull()
      .references(() => proveedores.id),
  },
  (table) => [
    primaryKey({ columns: [table.contratoId, table.proveedorId] }),
  ]
);
