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
import { instituciones } from "./instituciones.js";

export const licitaciones = pgTable(
  "licitaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ocdsId: text("ocds_id").notNull(),
    ocid: text("ocid").notNull(),
    titulo: text("titulo"),
    descripcion: text("descripcion"),
    estado: text("estado"),
    institucionId: uuid("institucion_id").references(() => instituciones.id),
    metodoAdquisicion: text("metodo_adquisicion"),
    categoriaPrincipal: text("categoria_principal"),
    valorEstimado: numeric("valor_estimado", { precision: 18, scale: 2 }),
    moneda: text("moneda").default("DOP"),
    periodoLicitacion: jsonb("periodo_licitacion"),
    periodoAdjudicacion: jsonb("periodo_adjudicacion"),
    numOferentes: integer("num_oferentes"),
    fechaPublicacion: timestamp("fecha_publicacion", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("licitaciones_institucion_idx").on(table.institucionId),
    index("licitaciones_fecha_idx").on(table.fechaPublicacion),
  ]
);
