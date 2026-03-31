import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const grafoAristas = pgTable(
  "grafo_aristas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nodoOrigenTipo: text("nodo_origen_tipo").notNull(),
    nodoOrigenId: uuid("nodo_origen_id").notNull(),
    nodoDestinoTipo: text("nodo_destino_tipo").notNull(),
    nodoDestinoId: uuid("nodo_destino_id").notNull(),
    tipoRelacion: text("tipo_relacion").notNull(),
    peso: numeric("peso", { precision: 18, scale: 2 }),
    numContratos: integer("num_contratos"),
    metadata: jsonb("metadata"),
  },
  (table) => [
    unique("grafo_aristas_unique").on(
      table.nodoOrigenId,
      table.nodoDestinoId,
      table.tipoRelacion
    ),
    index("grafo_origen_idx").on(table.nodoOrigenId),
    index("grafo_destino_idx").on(table.nodoDestinoId),
  ]
);

export const estadisticasHhi = pgTable("estadisticas_hhi", {
  id: uuid("id").primaryKey().defaultRandom(),
  institucionId: uuid("institucion_id").notNull(),
  categoria: text("categoria"),
  periodo: text("periodo"),
  hhiScore: numeric("hhi_score", { precision: 10, scale: 2 }),
  numProveedores: integer("num_proveedores"),
  proveedorDominanteId: uuid("proveedor_dominante_id"),
  porcentajeDominante: numeric("porcentaje_dominante", {
    precision: 5,
    scale: 2,
  }),
  calculadoEn: timestamp("calculado_en", { withTimezone: true }).defaultNow(),
});
