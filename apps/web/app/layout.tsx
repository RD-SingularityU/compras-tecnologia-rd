import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Sidebar } from "@/components/sidebar";
import { BotonTema } from "@/components/boton-tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compras Tecnologia RD",
  description:
    "Visualizacion de contrataciones publicas de tecnologia en Republica Dominicana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* Evita flash al cargar: aplica tema antes del primer paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('tema');if(t==='claro'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-slate-50 dark:bg-[#05050a] text-slate-900 dark:text-zinc-100 overflow-hidden`}
      >
        {/* Sidebar de navegación izquierdo */}
        <Sidebar />

        {/* Contenido principal — altura exacta del viewport, sin scroll en body */}
        <div className="pl-16 flex flex-col h-screen">
          {/* Header global */}
          <header className="flex-shrink-0 border-b border-slate-200 dark:border-[#1a1a2e] bg-white/80 dark:bg-[#0a0a14]/80 backdrop-blur-sm z-40">
            <div className="px-6 flex h-12 items-center justify-between">
              <span className="text-sm text-slate-400 dark:text-zinc-500 font-medium tracking-wide">
                Compras Tech RD
              </span>
              <BotonTema />
            </div>
          </header>

          {/* Área de contenido — scroll interno, el footer siempre es visible */}
          <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            {children}
          </main>

          {/* Footer siempre visible al pie */}
          <footer className="flex-shrink-0 border-t border-slate-200 dark:border-[#1a1a2e] bg-white/60 dark:bg-[#0a0a14]/60 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
              <span>Compras Tech RD — Transparencia en contrataciones públicas de tecnología</span>
              <span>Datos: <a href="https://datosabiertos.dgcp.gob.do" target="_blank" rel="noopener" className="hover:text-slate-600 dark:hover:text-zinc-300 underline underline-offset-2">DGCP API</a> · República Dominicana</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
