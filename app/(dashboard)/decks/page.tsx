import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function DecksPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: {
      tournament: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const formatDeckCards = (cards: unknown) => {
    if (!Array.isArray(cards)) return 0;
    return cards.reduce((sum, card: unknown) => {
      if (typeof card === "object" && card !== null && "quantity" in card) {
        return sum + (Number((card as { quantity: number }).quantity) || 0);
      }
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-pixel text-3xl text-digimon-green">MIS MAZOS</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            {decks.length} mazo{decks.length !== 1 ? "s" : ""} creado{decks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/decks/new" className="pixel-button">
          + NUEVO MAZO
        </Link>
      </div>

      {decks.length === 0 ? (
        <div className="pixel-card text-center py-16" style={{ borderColor: "#008f3a" }}>
          <div className="text-6xl mb-4">🃏</div>
          <h2 className="font-pixel text-xl text-digimon-green mb-2">SIN MAZOS AÚN</h2>
          <p className="font-mono-pixel text-pixel-gray mb-6 max-w-md mx-auto">
            Crea tu primer mazo para los torneos. Busca cartas, ajusta cantidades y exporta para compartir.
          </p>
          <Link href="/decks/new" className="pixel-button inline-flex">
            CREAR PRIMER MAZO
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              className="deck-card group"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-pixel text-lg text-digimon-green truncate">
                    {deck.name}
                  </h3>
                  <p className="font-mono-pixel text-xs text-pixel-gray mt-1">
                    {deck.format} • {formatDeckCards(deck.cards)} cartas
                  </p>
                </div>
                {deck.tournament && (
                  <span className="font-pixel text-xs text-digimon-orange bg-crt-dark px-2 py-1 border-2 border-digimon-orange whitespace-nowrap">
                    🏆 {deck.tournament.name}
                  </span>
                )}
              </div>
              {deck.description && (
                <p className="font-mono-pixel text-sm text-pixel-white/80 line-clamp-2 mb-4">
                  {deck.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-4 border-t-2 border-crt-border/50">
                <span className="font-mono-pixel text-xs text-pixel-gray">
                  Actualizado:{" "}
                  {format(new Date(deck.updatedAt), "dd MMM yyyy", { locale: es })}
                </span>
                <span className="font-pixel text-xs text-digimon-green group-hover:text-digimon-light-green transition-colors">
                  VER DETALLES →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}