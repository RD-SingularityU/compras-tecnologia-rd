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
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen bg-slate-50 dark:bg-[#05050a] text-slate-900 dark:text-zinc-100`}
      >
        {/* Sidebar de navegación izquierdo */}
        <Sidebar />

        {/* Contenido principal — desplazado a la derecha del sidebar (w-16 = 64px) */}
        <div className="pl-16 flex flex-col min-h-screen">
          {/* Header global */}
          <header className="border-b border-slate-200 dark:border-[#1a1a2e] bg-white/80 dark:bg-[#0a0a14]/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-6 flex h-12 items-center justify-between">
              <span className="text-sm text-slate-400 dark:text-zinc-500 font-medium tracking-wide">
                Compras Tech RD
              </span>
              <BotonTema />
            </div>
          </header>

          {/* Área de contenido — sin max-w para aprovechar todo el viewport */}
          <main className="flex-1 px-6 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
