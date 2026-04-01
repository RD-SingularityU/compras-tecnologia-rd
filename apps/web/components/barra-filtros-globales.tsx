"use client";

import { useEffect, useState, useMemo } from "react";
import {
  type FiltrosGlobales,
  type NombrePagina,
  FILTROS_POR_PAGINA,
  ETIQUETAS_FILTROS,
  useFiltrosGlobales,
} from "@/lib/filtros-globales";

interface OpcionesFiltros {
  sectores: string[];
  metodos_adquisicion: string[];
  instituciones: Array<{ id: string; nombre: string }>;
}

interface BarraFiltrosProps {
  pagina: NombrePagina;
  onFiltrosChange?: (filtros: FiltrosGlobales) => void;
  onListo?: () => void;
}

const inputClase =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500";
const selectClase =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500";

export function BarraFiltrosGlobales({
  pagina,
  onFiltrosChange,
  onListo,
}: BarraFiltrosProps) {
  const {
    filtros,
    setFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    listo,
  } = useFiltrosGlobales(pagina);

  const [opciones, setOpciones] = useState<OpcionesFiltros>({
    sectores: [],
    metodos_adquisicion: [],
    instituciones: [],
  });

  const filtrosPermitidos = useMemo(
    () => new Set(FILTROS_POR_PAGINA[pagina]),
    [pagina]
  );

  // Cargar opciones para dropdowns
  useEffect(() => {
    fetch("/api/opciones-filtros")
      .then((r) => r.json())
      .then(setOpciones)
      .catch(() => {});
  }, []);

  // Notificar cambios de filtros al componente padre
  useEffect(() => {
    if (listo) {
      onFiltrosChange?.(filtros);
      onListo?.();
    }
  }, [filtros, listo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar nombre de institucion para pill
  const institucionNombre = useMemo(() => {
    if (!filtros.institucion_id) return "";
    return (
      opciones.instituciones.find((i) => i.id === filtros.institucion_id)
        ?.nombre ?? filtros.institucion_id.slice(0, 8)
    );
  }, [filtros.institucion_id, opciones.instituciones]);

  const mostrarFecha = filtrosPermitidos.has("fecha_desde");
  const mostrarSector = filtrosPermitidos.has("sector");
  const mostrarMetodo = filtrosPermitidos.has("metodo_adquisicion");
  const mostrarInstitucion = filtrosPermitidos.has("institucion_id");
  const mostrarMonto = filtrosPermitidos.has("monto_min");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Periodo de tiempo */}
        {mostrarFecha && (
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Desde</label>
              <input
                type="date"
                value={filtros.fecha_desde ?? ""}
                onChange={(e) => setFiltro("fecha_desde", e.target.value)}
                className={inputClase}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filtros.fecha_hasta ?? ""}
                onChange={(e) => setFiltro("fecha_hasta", e.target.value)}
                className={inputClase}
              />
            </div>
          </div>
        )}

        {/* Sector */}
        {mostrarSector && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sector</label>
            <select
              value={filtros.sector ?? ""}
              onChange={(e) => setFiltro("sector", e.target.value)}
              className={selectClase}
            >
              <option value="">Todos los sectores</option>
              {opciones.sectores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo de contratacion */}
        {mostrarMetodo && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Tipo contratacion
            </label>
            <select
              value={filtros.metodo_adquisicion ?? ""}
              onChange={(e) => setFiltro("metodo_adquisicion", e.target.value)}
              className={selectClase}
            >
              <option value="">Todos los metodos</option>
              {opciones.metodos_adquisicion.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Institucion */}
        {mostrarInstitucion && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Institucion
            </label>
            <select
              value={filtros.institucion_id ?? ""}
              onChange={(e) => setFiltro("institucion_id", e.target.value)}
              className={`${selectClase} max-w-xs`}
            >
              <option value="">Todas las instituciones</option>
              {opciones.instituciones.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Monto */}
        {mostrarMonto && (
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Monto min (RD$)
              </label>
              <input
                type="number"
                placeholder="0"
                value={filtros.monto_min ?? ""}
                onChange={(e) => setFiltro("monto_min", e.target.value)}
                className={`${inputClase} w-32`}
                min={0}
                step={100000}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Monto max (RD$)
              </label>
              <input
                type="number"
                placeholder="Sin limite"
                value={filtros.monto_max ?? ""}
                onChange={(e) => setFiltro("monto_max", e.target.value)}
                className={`${inputClase} w-32`}
                min={0}
                step={100000}
              />
            </div>
          </div>
        )}

        {/* Boton limpiar */}
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Pills de filtros activos */}
      {hayFiltrosActivos && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Filtros activos:</span>
          {filtros.fecha_desde && (
            <PillFiltro
              label={`Desde: ${filtros.fecha_desde}`}
              color="purple"
              onLimpiar={() => setFiltro("fecha_desde", "")}
            />
          )}
          {filtros.fecha_hasta && (
            <PillFiltro
              label={`Hasta: ${filtros.fecha_hasta}`}
              color="purple"
              onLimpiar={() => setFiltro("fecha_hasta", "")}
            />
          )}
          {filtros.sector && (
            <PillFiltro
              label={`Sector: ${filtros.sector}`}
              color="amber"
              onLimpiar={() => setFiltro("sector", "")}
            />
          )}
          {filtros.metodo_adquisicion && (
            <PillFiltro
              label={`Tipo: ${filtros.metodo_adquisicion}`}
              color="cyan"
              onLimpiar={() => setFiltro("metodo_adquisicion", "")}
            />
          )}
          {filtros.institucion_id && (
            <PillFiltro
              label={`Institucion: ${institucionNombre}`}
              color="green"
              onLimpiar={() => setFiltro("institucion_id", "")}
            />
          )}
          {filtros.monto_min && (
            <PillFiltro
              label={`Min: RD$${Number(filtros.monto_min).toLocaleString("es-DO")}`}
              color="orange"
              onLimpiar={() => setFiltro("monto_min", "")}
            />
          )}
          {filtros.monto_max && (
            <PillFiltro
              label={`Max: RD$${Number(filtros.monto_max).toLocaleString("es-DO")}`}
              color="orange"
              onLimpiar={() => setFiltro("monto_max", "")}
            />
          )}
        </div>
      )}
    </div>
  );
}

const COLORES_PILL: Record<string, string> = {
  purple: "border-purple-400/30 bg-purple-400/10 text-purple-400 hover:bg-purple-400/20",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20",
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20",
  green: "border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20",
  orange: "border-orange-400/30 bg-orange-400/10 text-orange-400 hover:bg-orange-400/20",
  blue: "border-blue-400/30 bg-blue-400/10 text-blue-400 hover:bg-blue-400/20",
};

function PillFiltro({
  label,
  color,
  onLimpiar,
}: {
  label: string;
  color: string;
  onLimpiar: () => void;
}) {
  return (
    <button
      onClick={onLimpiar}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${COLORES_PILL[color] ?? COLORES_PILL.blue}`}
    >
      {label}
      <span className="ml-1">×</span>
    </button>
  );
}
