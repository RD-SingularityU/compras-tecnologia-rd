import { z } from "zod";

// Tipos basados en OCDS 1.1.5 (Open Contracting Data Standard)
// Referencia: https://standard.open-contracting.org/latest/en/schema/

export const DireccionSchema = z.object({
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  countryName: z.string().optional(),
});

export const ContactoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
  url: z.string().optional(),
});

export const IdentificadorSchema = z.object({
  id: z.string(),
  scheme: z.string().optional(),
  legalName: z.string().optional(),
  uri: z.string().optional(),
});

export const OrganizacionSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: IdentificadorSchema.optional(),
  address: DireccionSchema.optional(),
  contactPoint: ContactoSchema.optional(),
  roles: z.array(z.string()).optional(),
  details: z
    .object({
      scale: z.string().optional(),
      isWomenOwned: z.boolean().optional(),
    })
    .optional(),
});

export const ValorSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().default("DOP"),
});

export const PeriodoSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const DocumentoSchema = z.object({
  id: z.string(),
  documentType: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  format: z.string().optional(),
  datePublished: z.string().optional(),
  language: z.string().optional(),
});

export const LicitacionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  procurementMethod: z.string().optional(),
  procurementMethodDetails: z.string().optional(),
  mainProcurementCategory: z.string().optional(),
  value: ValorSchema.optional(),
  tenderPeriod: PeriodoSchema.optional(),
  awardPeriod: PeriodoSchema.optional(),
  numberOfTenderers: z.number().optional(),
  tenderers: z.array(OrganizacionSchema).optional(),
  documents: z.array(DocumentoSchema).optional(),
});

export const AdjudicacionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  value: ValorSchema.optional(),
  suppliers: z.array(OrganizacionSchema).optional(),
  documents: z.array(DocumentoSchema).optional(),
});

export const ContratoSchema = z.object({
  id: z.string(),
  awardID: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  value: ValorSchema.optional(),
  dateSigned: z.string().optional(),
  period: PeriodoSchema.optional(),
  documents: z.array(DocumentoSchema).optional(),
});

export const ReleaseSchema = z.object({
  ocid: z.string(),
  id: z.string(),
  date: z.string(),
  tag: z.array(z.string()),
  initiationType: z.string().optional(),
  language: z.string().optional(),
  buyer: OrganizacionSchema.optional(),
  parties: z.array(OrganizacionSchema).optional(),
  tender: LicitacionSchema.optional(),
  awards: z.array(AdjudicacionSchema).optional(),
  contracts: z.array(ContratoSchema).optional(),
});

// Tipos TypeScript inferidos de los schemas Zod
export type Direccion = z.infer<typeof DireccionSchema>;
export type Contacto = z.infer<typeof ContactoSchema>;
export type Identificador = z.infer<typeof IdentificadorSchema>;
export type Organizacion = z.infer<typeof OrganizacionSchema>;
export type Valor = z.infer<typeof ValorSchema>;
export type Periodo = z.infer<typeof PeriodoSchema>;
export type Documento = z.infer<typeof DocumentoSchema>;
export type Licitacion = z.infer<typeof LicitacionSchema>;
export type Adjudicacion = z.infer<typeof AdjudicacionSchema>;
export type Contrato = z.infer<typeof ContratoSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
