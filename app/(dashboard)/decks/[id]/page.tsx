import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ExportJsonButton from "@/components/export-json-button";
import DeckGallery from "@/components/deck-gallery";
import {
  getDeckComposition,
  normalizeDeckCards,
  sortCardsByLevel,
  MAIN_DECK_SIZE,
  MAX_LEVEL2_CARDS,
} from "@/lib/deck-schema";

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

  const isOwner =
    session?.user?.id === deck.userId || isAdmin(session);
  const cards = normalizeDeckCards(deck.cards);
  const { mainCards, level2Cards, mainCount, level2Count } =
    getDeckComposition(cards);
  const orderedCards = sortCardsByLevel([...mainCards, ...level2Cards]);

  const exportData = {
    name: deck.name,
    author: deck.user.name,
    date: format(new Date(deck.createdAt), "yyyy-MM-dd"),
    mainDeck: mainCards.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      quantity: c.quantity,
    })),
    level2: level2Cards.map((c) => ({
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
          <h1 className="font-pixel text-3xl text-digimon-green">
            {deck.name}
          </h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            Por {deck.user.name} • {mainCount} cartas de mazo + {level2Count} de
            nivel 2
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Link
              href={`/decks/${deck.id}/edit`}
              className="pixel-button-secondary"
            >
              EDITAR
            </Link>
          )}
          <ExportJsonButton
            data={exportData}
            filename={`${deck.name.replace(/\s+/g, "-")}.json`}
          />
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
          <h2 className="font-pixel text-lg text-digimon-green mb-3">
            DESCRIPCIÓN
          </h2>
          <p className="font-mono-pixel text-pixel-white whitespace-pre-wrap">
            {deck.description}
          </p>
        </div>
      )}

      <section className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-pixel text-lg text-digimon-green">
            CARTAS DEL MAZO
          </h2>
          <div className="flex flex-wrap gap-2">
            <span
              className={`font-pixel text-sm bg-crt-dark px-3 py-1 border-2 ${
                mainCount === MAIN_DECK_SIZE
                  ? "text-digimon-yellow border-digimon-yellow"
                  : "text-digimon-orange border-digimon-orange"
              }`}
            >
              MAZO {mainCount}/{MAIN_DECK_SIZE}
            </span>
            <span
              className={`font-pixel text-sm bg-crt-dark px-3 py-1 border-2 ${
                level2Count <= MAX_LEVEL2_CARDS
                  ? "text-digimon-yellow border-digimon-yellow"
                  : "text-digimon-orange border-digimon-orange"
              }`}
            >
              DIGI-EGG {level2Count}/{MAX_LEVEL2_CARDS}
            </span>
          </div>
        </div>
        <p className="font-mono-pixel text-xs text-pixel-gray mb-4">
          Ordenadas por nivel (2 → 7), después Options y Tamers. Pasa el ratón
          por una carta (o tócala) para verla ampliada con sus efectos.
        </p>

        <DeckGallery cards={orderedCards} />
      </section>

      <div
        className="pixel-card text-center"
        style={{ borderColor: "#008f3a" }}
      >
        <p className="font-mono-pixel text-pixel-gray text-sm">
          Creado:{" "}
          {format(new Date(deck.createdAt), "dd 'de' MMMM 'de' yyyy", {
            locale: es,
          })}
          {deck.updatedAt !== deck.createdAt && (
            <>
              <span className="mx-2">•</span>
              Actualizado:{" "}
              {format(new Date(deck.updatedAt), "dd 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
