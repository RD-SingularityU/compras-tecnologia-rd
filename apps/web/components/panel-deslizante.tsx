"use client";

import { useEffect } from "react";

interface PanelDeslizanteProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: React.ReactNode;
}

/**
 * Panel contextual que se desliza desde el borde derecho de la pantalla.
 * Ocupa el 50% del viewport. Cierra con Escape o clic en el backdrop.
 */
export function PanelDeslizante({ abierto, onCerrar, titulo, children }: PanelDeslizanteProps) {
  // Bloquear scroll del body cuando el panel está abierto
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [abierto, onCerrar]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCerrar}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel deslizante */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-1/2 min-w-[380px] max-w-[720px] bg-white dark:bg-[#0d0d1a] border-l border-slate-200 dark:border-[#1a1a2e] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header del panel */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1a1a2e] flex-shrink-0">
          {titulo && (
            <h2 className="text-sm font-semibold text-slate-700 dark:text-zinc-200 truncate pr-4">
              {titulo}
            </h2>
          )}
          <button
            onClick={onCerrar}
            className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
            aria-label="Cerrar panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
