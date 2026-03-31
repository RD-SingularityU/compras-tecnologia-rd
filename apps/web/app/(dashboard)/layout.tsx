import Link from "next/link";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/contratos", label: "Contratos" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/instituciones", label: "Instituciones" },
  { href: "/red", label: "Red" },
  { href: "/concentracion", label: "Concentracion" },
  { href: "/alertas", label: "Alertas" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-zinc-100"
            >
              Compras Tech RD
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
