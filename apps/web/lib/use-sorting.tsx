"use client";

import { useState, useCallback } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  columna: string;
  direccion: SortDir;
}

export function useSorting(columnaInicial: string, dirInicial: SortDir = "desc") {
  const [sort, setSort] = useState<SortState>({
    columna: columnaInicial,
    direccion: dirInicial,
  });

  const toggleSort = useCallback((columna: string) => {
    setSort((prev) => ({
      columna,
      direccion:
        prev.columna === columna && prev.direccion === "desc" ? "asc" : "desc",
    }));
  }, []);

  return { sort, toggleSort };
}

export function SortHeader({
  columna,
  label,
  sort,
  onSort,
  className = "",
}: {
  columna: string;
  label: string;
  sort: SortState;
  onSort: (col: string) => void;
  className?: string;
}) {
  const activa = sort.columna === columna;

  return (
    <th
      className={`px-4 py-3 text-zinc-400 font-medium cursor-pointer select-none hover:text-zinc-200 transition-colors ${className}`}
      onClick={() => onSort(columna)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-xs">
          {activa ? (sort.direccion === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}
