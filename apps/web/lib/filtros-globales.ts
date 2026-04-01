"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Tipos de filtros globales
export interface FiltrosGlobales {
  fecha_desde?: string;
  fecha_hasta?: string;
  sector?: string;
  metodo_adquisicion?: string;
  institucion_id?: string;
  monto_min?: string;
  monto_max?: string;
}

export const CLAVES_FILTROS: (keyof FiltrosGlobales)[] = [
  "fecha_desde",
  "fecha_hasta",
  "sector",
  "metodo_adquisicion",
  "institucion_id",
  "monto_min",
  "monto_max",
];

// Que filtros aplican en cada pagina
export type NombrePagina =
  | "contratos"
  | "instituciones"
  | "proveedores"
  | "alertas"
  | "concentracion"
  | "dashboard"
  | "red";

export const FILTROS_POR_PAGINA: Record<
  NombrePagina,
  (keyof FiltrosGlobales)[]
> = {
  contratos: [
    "fecha_desde",
    "fecha_hasta",
    "sector",
    "metodo_adquisicion",
    "institucion_id",
    "monto_min",
    "monto_max",
  ],
  instituciones: ["sector", "fecha_desde", "fecha_hasta", "monto_min", "monto_max"],
  proveedores: [
    "sector",
    "fecha_desde",
    "fecha_hasta",
    "monto_min",
    "monto_max",
    "institucion_id",
  ],
  alertas: ["fecha_desde", "fecha_hasta", "sector", "institucion_id"],
  concentracion: ["sector", "institucion_id"],
  dashboard: ["fecha_desde", "fecha_hasta", "sector", "institucion_id"],
  red: ["sector", "institucion_id"],
};

// Etiquetas para mostrar los filtros activos
export const ETIQUETAS_FILTROS: Record<keyof FiltrosGlobales, string> = {
  fecha_desde: "Desde",
  fecha_hasta: "Hasta",
  sector: "Sector",
  metodo_adquisicion: "Tipo contratacion",
  institucion_id: "Institucion",
  monto_min: "Monto min",
  monto_max: "Monto max",
};

// Hook que sincroniza filtros con URL search params
export function useFiltrosGlobales(pagina: NombrePagina) {
  const router = useRouter();
  const pathname = usePathname();
  const filtrosPermitidos = FILTROS_POR_PAGINA[pagina];

  const [filtros, setFiltros] = useState<FiltrosGlobales>({});
  const [listo, setListo] = useState(false);

  // Leer filtros de URL al montar
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const iniciales: FiltrosGlobales = {};
    for (const clave of filtrosPermitidos) {
      const valor = sp.get(clave);
      if (valor) iniciales[clave] = valor;
    }
    setFiltros(iniciales);
    setListo(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar URL cuando cambian los filtros
  const actualizarUrl = useCallback(
    (nuevosFiltros: FiltrosGlobales) => {
      const sp = new URLSearchParams(window.location.search);
      // Limpiar filtros globales previos
      for (const clave of CLAVES_FILTROS) {
        sp.delete(clave);
      }
      // Setear solo los activos
      for (const [clave, valor] of Object.entries(nuevosFiltros)) {
        if (valor) sp.set(clave, valor);
      }
      // Resetear paginacion
      sp.set("pagina", "1");
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [pathname, router]
  );

  const setFiltro = useCallback(
    (clave: keyof FiltrosGlobales, valor: string) => {
      setFiltros((prev) => {
        const nuevos = { ...prev, [clave]: valor || undefined };
        if (!valor) delete nuevos[clave];
        actualizarUrl(nuevos);
        return nuevos;
      });
    },
    [actualizarUrl]
  );

  const limpiarFiltros = useCallback(() => {
    setFiltros({});
    actualizarUrl({});
  }, [actualizarUrl]);

  // Helper para construir query params para fetch
  const construirQueryParams = useCallback(
    (paramsExtra?: Record<string, string>) => {
      const params = new URLSearchParams(paramsExtra);
      for (const [clave, valor] of Object.entries(filtros)) {
        if (valor) params.set(clave, valor);
      }
      return params;
    },
    [filtros]
  );

  const hayFiltrosActivos = Object.values(filtros).some((v) => v);

  return {
    filtros,
    setFiltro,
    limpiarFiltros,
    construirQueryParams,
    hayFiltrosActivos,
    listo,
  };
}
