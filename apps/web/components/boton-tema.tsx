"use client";

import { useEffect, useState } from "react";

export function BotonTema() {
  const [oscuro, setOscuro] = useState(true);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const guardado = localStorage.getItem("tema");
    const esOscuro = guardado !== "claro";
    setOscuro(esOscuro);
  }, []);

  function alternar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    localStorage.setItem("tema", nuevo ? "oscuro" : "claro");
    document.documentElement.classList.toggle("dark", nuevo);
  }

  if (!montado) return <div className="w-32 h-8" />;

  return (
    <button
      onClick={alternar}
      className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900"
    >
      {oscuro ? (
        <>
          <IconSol />
          Modo claro
        </>
      ) : (
        <>
          <IconLuna />
          Modo oscuro
        </>
      )}
    </button>
  );
}

function IconSol() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconLuna() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
