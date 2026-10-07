import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import AdminDecksTable from "@/components/admin-decks-table";

export default async function AdminDecksPage() {
  await requireAdmin();

  const decks = await prisma.deck.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true } },
      tournament: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-pixel text-3xl text-digimon-yellow">MAZOS DE TODOS</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            {decks.length} mazo{decks.length !== 1 ? "s" : ""} registrado{decks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/decks/new" className="pixel-button">
          + NUEVO MAZO PARA USUARIO
        </Link>
      </div>

      <AdminDecksTable
        decks={decks.map((d) => ({
          id: d.id,
          name: d.name,
          ownerName: d.user.name,
          tournamentName: d.tournament?.name ?? null,
          updatedAt: d.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
