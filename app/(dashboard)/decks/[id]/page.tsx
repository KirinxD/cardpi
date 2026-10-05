import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, id: true } },
      tournament: { select: { name: true, id: true } },
    },
  });

  if (!deck) {
    notFound();
  }

  const isOwner = session?.user?.id === deck.userId;
  const cards = (deck.cards as Array<{
    cardId: string;
    name: string;
    quantity: number;
    isSideboard: boolean;
    imageUrl?: string;
    setCode?: string;
    color?: string;
    type?: string;
    level?: string;
    cost?: number;
    dp?: number;
  }>) || [];

  const mainDeck = cards.filter((c) => !c.isSideboard);
  const sideboard = cards.filter((c) => c.isSideboard);
  const mainCount = mainDeck.reduce((sum, c) => sum + c.quantity, 0);
  const sideCount = sideboard.reduce((sum, c) => sum + c.quantity, 0);

  const exportData = {
    name: deck.name,
    format: deck.format,
    author: deck.user.name,
    date: format(new Date(deck.createdAt), "yyyy-MM-dd"),
    mainDeck: mainDeck.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      quantity: c.quantity,
    })),
    sideboard: sideboard.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      quantity: c.quantity,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/decks"
            className="font-pixel text-xs text-pixel-gray hover:text-digimon-green transition-colors mb-2 inline-block"
          >
            ← VOLVER A MAZOS
          </Link>
          <h1 className="font-pixel text-3xl text-digimon-green">{deck.name}</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            Por {deck.user.name} • {deck.format} • {mainCount} cartas principal + {sideCount} sideboard
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Link href={`/decks/${deck.id}/edit`} className="pixel-button-secondary">
              EDITAR
            </Link>
          )}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${deck.name.replace(/\s+/g, "-")}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="pixel-button"
          >
            EXPORTAR JSON
          </button>
          {deck.tournament && (
            <Link
              href={`/tournaments/${deck.tournament.id}`}
              className="pixel-button-secondary flex items-center"
            >
              🏆 {deck.tournament.name}
            </Link>
          )}
        </div>
      </div>

      {deck.description && (
        <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
          <h2 className="font-pixel text-lg text-digimon-green mb-3">DESCRIPCIÓN</h2>
          <p className="font-mono-pixel text-pixel-white whitespace-pre-wrap">{deck.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="pixel-card" style={{ borderColor: "#008f3a" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-pixel text-lg text-digimon-green">MAZO PRINCIPAL</h2>
            <span className="font-pixel text-sm text-digimon-yellow bg-crt-dark px-3 py-1 border-2 border-digimon-yellow">
              {mainCount}/50
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {mainDeck.length === 0 ? (
              <p className="font-mono-pixel text-pixel-gray text-center py-8">Sin cartas</p>
            ) : (
              mainDeck.map((card) => (
                <div
                  key={card.cardId}
                  className="pixel-card flex items-center gap-3 p-3"
                  style={{ borderColor: "#004411" }}
                >
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-12 h-12 pixelated rounded border-2 border-crt-border flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-sm text-digimon-green truncate">{card.name}</p>
                    <p className="font-mono-pixel text-xs text-pixel-gray">
                      {card.setCode} • {card.color} • {card.type} • Cost: {card.cost} • DP: {card.dp}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-pixel text-xl text-digimon-yellow w-10 text-center bg-crt-dark px-2 py-1 border-2 border-digimon-yellow">
                      ×{card.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="pixel-card" style={{ borderColor: "#cc5400" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-pixel text-lg text-digimon-orange">SIDEBOARD</h2>
            <span className="font-pixel text-sm text-digimon-yellow bg-crt-dark px-3 py-1 border-2 border-digimon-yellow">
              {sideCount}/10
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {sideboard.length === 0 ? (
              <p className="font-mono-pixel text-pixel-gray text-center py-8">Sideboard vacío</p>
            ) : (
              sideboard.map((card) => (
                <div
                  key={card.cardId}
                  className="pixel-card flex items-center gap-3 p-3"
                  style={{ borderColor: "#004411" }}
                >
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-10 h-10 pixelated rounded border-2 border-crt-border flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-sm text-digimon-green truncate">{card.name}</p>
                    <p className="font-mono-pixel text-xs text-pixel-gray">
                      {card.setCode} • {card.color}
                    </p>
                  </div>
                  <span className="font-pixel text-lg text-digimon-yellow w-10 text-center bg-crt-dark px-2 py-1 border-2 border-digimon-yellow">
                    ×{card.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="pixel-card text-center" style={{ borderColor: "#008f3a" }}>
        <p className="font-mono-pixel text-pixel-gray text-sm">
          Creado: {format(new Date(deck.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
          {deck.updatedAt !== deck.createdAt && (
            <>
              <span className="mx-2">•</span>
              Actualizado: {format(new Date(deck.updatedAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </>
          )}
        </p>
      </div>
    </div>
  );
}