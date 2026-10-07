import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export default async function AdminHomePage() {
  await requireAdmin();

  const [users, tournaments, decks, posts] = await Promise.all([
    prisma.user.count(),
    prisma.tournament.count(),
    prisma.deck.count(),
    prisma.post.count(),
  ]);

  const sections = [
    {
      href: "/admin/users",
      label: "USUARIOS",
      icon: "👥",
      count: users,
      description: "Gestionar cuentas y roles (USER/ADMIN)",
      borderColor: "#008f3a",
    },
    {
      href: "/admin/decks",
      label: "MAZOS",
      icon: "🃏",
      count: decks,
      description: "Ver, editar o borrar cualquier mazo",
      borderColor: "#00b84a",
    },
    {
      href: "/tournaments",
      label: "TORNEOS",
      icon: "🏆",
      count: tournaments,
      description: "Crear torneos y gestionar rondas y resultados",
      borderColor: "#cc5400",
    },
    {
      href: "/posts",
      label: "BLOG",
      icon: "📝",
      count: posts,
      description: "Entradas del blog",
      borderColor: "#0066cc",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pixel text-3xl text-digimon-yellow">PANEL DE ADMINISTRACIÓN</h1>
        <p className="font-mono-pixel text-pixel-gray mt-1">
          Solo administradores: torneos, usuarios y mazos de todos los jugadores
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="pixel-card flex items-center gap-4 p-5 hover:border-digimon-green transition-colors"
            style={{ borderColor: section.borderColor }}
          >
            <span className="text-4xl">{section.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <h2 className="font-pixel text-lg text-digimon-green">{section.label}</h2>
                <span className="font-pixel text-2xl text-digimon-yellow">{section.count}</span>
              </div>
              <p className="font-mono-pixel text-xs text-pixel-gray mt-1">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="pixel-card" style={{ borderColor: "#cc5400" }}>
        <h2 className="font-pixel text-lg text-digimon-orange mb-4">ACCIONES RÁPIDAS</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/tournaments/new" className="pixel-button">
            + NUEVO TORNEO
          </Link>
          <Link href="/decks/new" className="pixel-button-secondary">
            + NUEVO MAZO (PARA UN USUARIO)
          </Link>
          <Link href="/admin/users" className="pixel-button-secondary">
            + GESTIONAR ROLES
          </Link>
        </div>
      </div>
    </div>
  );
}
