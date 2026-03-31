"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSorting, SortHeader } from "@/lib/use-sorting";

interface Contrato {
  id: string;
  ocid: string;
  titulo: string;
  descripcion: string;
  estado: string;
  valor: string;
  moneda: string;
  fecha_firma: string;
  institucion_nombre: string;
  institucion_id: string;
  proveedores: Array<{ id: string; nombre: string; rnc: string }>;
}

function formatearMonto(valor: string | null): string {
  if (!valor) return "—";
  const num = parseFloat(valor);
  return `RD$${num.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default function PaginaContratos() {
  const router = useRouter();

  // Leer filtros iniciales de URL
  const [urlParams] = useState(() => {
    if (typeof window === "undefined") return { p: "", i: "", q: "" };
    const sp = new URLSearchParams(window.location.search);
    return {
      p: sp.get("proveedor_id") ?? "",
      i: sp.get("institucion_id") ?? "",
      q: sp.get("busqueda") ?? "",
    };
  });

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState(urlParams.q);
  const [proveedorId, setProveedorId] = useState(urlParams.p);
  const [institucionId, setInstitucionId] = useState(urlParams.i);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [institucionNombre, setInstitucionNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const { sort, toggleSort } = useSorting("fecha_firma");

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({
      pagina: String(pagina),
      limite: "20",
    });
    params.set("ordenar", sort.columna);
    params.set("dir", sort.direccion);
    if (busqueda) params.set("busqueda", busqueda);
    if (proveedorId) params.set("proveedor_id", proveedorId);
    if (institucionId) params.set("institucion_id", institucionId);

    fetch(`/api/contratos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContratos(data.datos);
        setTotal(data.total);
        if (proveedorId && data.datos.length > 0 && !proveedorNombre) {
          const prov = data.datos[0]?.proveedores?.find(
            (p: { id: string }) => p.id === proveedorId
          );
          if (prov) setProveedorNombre(prov.nombre);
        }
        if (institucionId && data.datos.length > 0 && !institucionNombre) {
          setInstitucionNombre(data.datos[0]?.institucion_nombre ?? "");
        }
      })
      .finally(() => setCargando(false));
  }, [pagina, busqueda, proveedorId, institucionId, sort.columna, sort.direccion]);

  const totalPaginas = Math.ceil(total / 20);

  function limpiarFiltro(campo: string) {
    if (campo === "proveedor") {
      setProveedorId("");
      setProveedorNombre("");
    } else {
      setInstitucionId("");
      setInstitucionNombre("");
    }
    setPagina(1);
    const params = new URLSearchParams(window.location.search);
    params.delete(campo === "proveedor" ? "proveedor_id" : "institucion_id");
    router.replace(`/contratos?${params.toString()}`);
  }

  function filtrarPorProveedor(id: string, nombre: string) {
    setProveedorId(id);
    setProveedorNombre(nombre);
    setPagina(1);
  }

  function filtrarPorInstitucion(id: string, nombre: string) {
    setInstitucionId(id);
    setInstitucionNombre(nombre);
    setPagina(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-sm text-zinc-400">
            {total.toLocaleString()} contratos
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por titulo o descripcion..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 w-72 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Filtros activos */}
      {(proveedorId || institucionId) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500">Filtros:</span>
          {proveedorId && (
            <button
              onClick={() => limpiarFiltro("proveedor")}
              className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-400 hover:bg-blue-400/20"
            >
              Proveedor: {proveedorNombre || proveedorId.slice(0, 8)}
              <span className="ml-1">×</span>
            </button>
          )}
          {institucionId && (
            <button
              onClick={() => limpiarFiltro("institucion")}
              className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs text-green-400 hover:bg-green-400/20"
            >
              Institucion: {institucionNombre || institucionId.slice(0, 8)}
              <span className="ml-1">×</span>
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <SortHeader columna="titulo" label="Titulo" sort={sort} onSort={toggleSort} className="text-left" />
              <SortHeader columna="institucion" label="Institucion" sort={sort} onSort={toggleSort} className="text-left" />
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Proveedor</th>
              <SortHeader columna="valor" label="Valor" sort={sort} onSort={toggleSort} className="text-right" />
              <SortHeader columna="fecha_firma" label="Fecha" sort={sort} onSort={toggleSort} className="text-left" />
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Cargando...
                </td>
              </tr>
            ) : contratos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No se encontraron contratos
                </td>
              </tr>
            ) : (
              contratos.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-zinc-200 line-clamp-1">
                      {c.titulo || c.ocid || "Sin titulo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.institucion_id ? (
                      <button
                        onClick={() =>
                          filtrarPorInstitucion(
                            c.institucion_id,
                            c.institucion_nombre
                          )
                        }
                        className="text-zinc-400 hover:text-green-400 text-left text-xs"
                        title="Filtrar por esta institucion"
                      >
                        {c.institucion_nombre || "—"}
                      </button>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.proveedores?.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {c.proveedores.map((p) => (
                          <button
                            key={p.id}
                            onClick={() =>
                              filtrarPorProveedor(p.id, p.nombre)
                            }
                            className="text-zinc-400 hover:text-blue-400 text-left text-xs"
                            title="Filtrar por este proveedor"
                          >
                            {p.nombre}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">
                    {formatearMonto(c.valor)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {c.fecha_firma
                      ? new Date(c.fecha_firma).toLocaleDateString("es-DO")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="rounded px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-zinc-400">
            Pagina {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className="rounded px-3 py-1.5 text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
