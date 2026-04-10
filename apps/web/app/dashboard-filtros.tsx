"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarraFiltrosGlobales } from "@/components/barra-filtros-globales";

export function DashboardFiltros() {
  return <BarraFiltrosGlobales pagina="dashboard" />;
}

// ── Filtros de fecha inline (para el encabezado del dashboard) ────────────────

function IconCalendario() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0 text-slate-400 dark:text-zinc-500"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function DashboardFiltrosInline() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  function actualizarFiltro(campo: "desde" | "hasta", valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) {
      params.set(campo, valor);
    } else {
      params.delete(campo);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const inputClase =
    "rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <IconCalendario />
        <label className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
          Desde
        </label>
        <input
          type="date"
          value={desde}
          onChange={(e) => actualizarFiltro("desde", e.target.value)}
          className={inputClase}
          style={{ colorScheme: isDark ? "dark" : "light" }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <IconCalendario />
        <label className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
          Hasta
        </label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => actualizarFiltro("hasta", e.target.value)}
          className={inputClase}
          style={{ colorScheme: isDark ? "dark" : "light" }}
        />
      </div>
    </div>
  );
}
