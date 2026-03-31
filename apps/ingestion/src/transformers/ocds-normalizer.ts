import type { Release, Organizacion } from "@compras-rd/ocds";

/**
 * Datos normalizados extraidos de un Release OCDS
 * Listos para insertar en la base de datos
 */
export interface DatosNormalizados {
  instituciones: InstitucionNorm[];
  proveedores: ProveedorNorm[];
  licitaciones: LicitacionNorm[];
  adjudicaciones: AdjudicacionNorm[];
  contratos: ContratoNorm[];
  vinculosAdjudicacion: { ocdsIdAdjudicacion: string; ocdsIdProveedor: string }[];
  vinculosContrato: { ocdsIdContrato: string; ocdsIdProveedor: string }[];
}

export interface InstitucionNorm {
  ocdsId: string;
  nombre: string;
  rnc: string | null;
  direccion: Record<string, unknown> | null;
  contacto: Record<string, unknown> | null;
  sector: string | null;
}

export interface ProveedorNorm {
  ocdsId: string;
  nombre: string;
  rnc: string | null;
  direccion: Record<string, unknown> | null;
  contacto: Record<string, unknown> | null;
}

export interface LicitacionNorm {
  ocdsId: string;
  ocid: string;
  titulo: string | null;
  descripcion: string | null;
  estado: string | null;
  ocdsIdInstitucion: string | null;
  metodoAdquisicion: string | null;
  categoriaPrincipal: string | null;
  valorEstimado: string | null;
  moneda: string;
  periodoLicitacion: Record<string, unknown> | null;
  periodoAdjudicacion: Record<string, unknown> | null;
  numOferentes: number | null;
  fechaPublicacion: string | null;
}

export interface AdjudicacionNorm {
  ocdsId: string;
  ocdsIdLicitacion: string | null;
  titulo: string | null;
  estado: string | null;
  fecha: string | null;
  valor: string | null;
  moneda: string;
}

export interface ContratoNorm {
  ocdsId: string;
  ocid: string;
  ocdsIdAdjudicacion: string | null;
  ocdsIdInstitucion: string | null;
  titulo: string | null;
  descripcion: string | null;
  estado: string | null;
  valor: string | null;
  moneda: string;
  fechaFirma: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
}

function extraerRnc(org: Organizacion): string | null {
  if (org.identifier?.id) return org.identifier.id;
  return null;
}

/**
 * Normaliza un Release OCDS en datos planos para la DB
 */
export function normalizarRelease(release: Release): DatosNormalizados {
  const resultado: DatosNormalizados = {
    instituciones: [],
    proveedores: [],
    licitaciones: [],
    adjudicaciones: [],
    contratos: [],
    vinculosAdjudicacion: [],
    vinculosContrato: [],
  };

  const ocid = release.ocid;

  // Extraer organizaciones de parties
  if (release.parties) {
    for (const party of release.parties) {
      const roles = party.roles ?? [];
      const esComprador = roles.includes("buyer") || roles.includes("procuringEntity");
      const esProveedor = roles.includes("supplier") || roles.includes("tenderer");

      if (esComprador) {
        resultado.instituciones.push({
          ocdsId: party.id,
          nombre: party.name,
          rnc: extraerRnc(party),
          direccion: party.address ? (party.address as Record<string, unknown>) : null,
          contacto: party.contactPoint ? (party.contactPoint as Record<string, unknown>) : null,
          sector: null,
        });
      }

      if (esProveedor) {
        resultado.proveedores.push({
          ocdsId: party.id,
          nombre: party.name,
          rnc: extraerRnc(party),
          direccion: party.address ? (party.address as Record<string, unknown>) : null,
          contacto: party.contactPoint ? (party.contactPoint as Record<string, unknown>) : null,
        });
      }
    }
  }

  // Buyer como institucion (fallback si no esta en parties)
  if (release.buyer) {
    const yaExiste = resultado.instituciones.some(
      (i) => i.ocdsId === release.buyer!.id
    );
    if (!yaExiste) {
      resultado.instituciones.push({
        ocdsId: release.buyer.id,
        nombre: release.buyer.name,
        rnc: extraerRnc(release.buyer),
        direccion: release.buyer.address
          ? (release.buyer.address as Record<string, unknown>)
          : null,
        contacto: release.buyer.contactPoint
          ? (release.buyer.contactPoint as Record<string, unknown>)
          : null,
        sector: null,
      });
    }
  }

  // Licitacion
  if (release.tender) {
    const t = release.tender;
    resultado.licitaciones.push({
      ocdsId: t.id,
      ocid,
      titulo: t.title ?? null,
      descripcion: t.description ?? null,
      estado: t.status ?? null,
      ocdsIdInstitucion: release.buyer?.id ?? null,
      metodoAdquisicion: t.procurementMethod ?? null,
      categoriaPrincipal: t.mainProcurementCategory ?? null,
      valorEstimado: t.value?.amount?.toString() ?? null,
      moneda: t.value?.currency ?? "DOP",
      periodoLicitacion: t.tenderPeriod
        ? (t.tenderPeriod as Record<string, unknown>)
        : null,
      periodoAdjudicacion: t.awardPeriod
        ? (t.awardPeriod as Record<string, unknown>)
        : null,
      numOferentes: t.numberOfTenderers ?? null,
      fechaPublicacion: release.date ?? null,
    });
  }

  // Adjudicaciones
  if (release.awards) {
    for (const award of release.awards) {
      resultado.adjudicaciones.push({
        ocdsId: award.id,
        ocdsIdLicitacion: release.tender?.id ?? null,
        titulo: award.title ?? null,
        estado: award.status ?? null,
        fecha: award.date ?? null,
        valor: award.value?.amount?.toString() ?? null,
        moneda: award.value?.currency ?? "DOP",
      });

      // Vinculos adjudicacion-proveedor
      if (award.suppliers) {
        for (const supplier of award.suppliers) {
          resultado.vinculosAdjudicacion.push({
            ocdsIdAdjudicacion: award.id,
            ocdsIdProveedor: supplier.id,
          });

          // Asegurar que el proveedor esta en la lista
          const yaExiste = resultado.proveedores.some(
            (p) => p.ocdsId === supplier.id
          );
          if (!yaExiste) {
            resultado.proveedores.push({
              ocdsId: supplier.id,
              nombre: supplier.name,
              rnc: extraerRnc(supplier),
              direccion: supplier.address
                ? (supplier.address as Record<string, unknown>)
                : null,
              contacto: supplier.contactPoint
                ? (supplier.contactPoint as Record<string, unknown>)
                : null,
            });
          }
        }
      }
    }
  }

  // Contratos
  if (release.contracts) {
    for (const contrato of release.contracts) {
      resultado.contratos.push({
        ocdsId: contrato.id,
        ocid,
        ocdsIdAdjudicacion: contrato.awardID ?? null,
        ocdsIdInstitucion: release.buyer?.id ?? null,
        titulo: contrato.title ?? null,
        descripcion: contrato.description ?? null,
        estado: contrato.status ?? null,
        valor: contrato.value?.amount?.toString() ?? null,
        moneda: contrato.value?.currency ?? "DOP",
        fechaFirma: contrato.dateSigned ?? null,
        periodoInicio: contrato.period?.startDate ?? null,
        periodoFin: contrato.period?.endDate ?? null,
      });

      // Vinculos contrato-proveedor (heredados de la adjudicacion)
      if (contrato.awardID) {
        const award = release.awards?.find((a) => a.id === contrato.awardID);
        if (award?.suppliers) {
          for (const supplier of award.suppliers) {
            resultado.vinculosContrato.push({
              ocdsIdContrato: contrato.id,
              ocdsIdProveedor: supplier.id,
            });
          }
        }
      }
    }
  }

  return resultado;
}

/**
 * Normaliza multiples releases, deduplicando entidades
 */
export function normalizarReleases(releases: Release[]): DatosNormalizados {
  const acumulado: DatosNormalizados = {
    instituciones: [],
    proveedores: [],
    licitaciones: [],
    adjudicaciones: [],
    contratos: [],
    vinculosAdjudicacion: [],
    vinculosContrato: [],
  };

  const idsInstituciones = new Set<string>();
  const idsProveedores = new Set<string>();

  for (const release of releases) {
    const datos = normalizarRelease(release);

    for (const inst of datos.instituciones) {
      if (!idsInstituciones.has(inst.ocdsId)) {
        idsInstituciones.add(inst.ocdsId);
        acumulado.instituciones.push(inst);
      }
    }

    for (const prov of datos.proveedores) {
      if (!idsProveedores.has(prov.ocdsId)) {
        idsProveedores.add(prov.ocdsId);
        acumulado.proveedores.push(prov);
      }
    }

    acumulado.licitaciones.push(...datos.licitaciones);
    acumulado.adjudicaciones.push(...datos.adjudicaciones);
    acumulado.contratos.push(...datos.contratos);
    acumulado.vinculosAdjudicacion.push(...datos.vinculosAdjudicacion);
    acumulado.vinculosContrato.push(...datos.vinculosContrato);
  }

  return acumulado;
}
