import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ExportJsonButton from "@/components/export-json-button";
import {
  getDeckComposition,
  normalizeDeckCards,
  sortCardsByLevel,
  isLevel2Card,
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

  const isOwner = session?.user?.id === deck.userId;
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
          <h1 className="font-pixel text-3xl text-digimon-green">{deck.name}</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            Por {deck.user.name} • {mainCount} cartas de mazo + {level2Count} de
            nivel 2
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Link href={`/decks/${deck.id}/edit`} className="pixel-button-secondary">
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
          <h2 className="font-pixel text-lg text-digimon-green mb-3">DESCRIPCIÓN</h2>
          <p className="font-mono-pixel text-pixel-white whitespace-pre-wrap">
            {deck.description}
          </p>
        </div>
      )}

      <section className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-pixel text-lg text-digimon-green">CARTAS DEL MAZO</h2>
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
              NIVEL 2 {level2Count}/{MAX_LEVEL2_CARDS}
            </span>
          </div>
        </div>
        <p className="font-mono-pixel text-xs text-pixel-gray mb-4">
          Ordenadas por nivel (2 → 7), después Options y Tamers.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {orderedCards.length === 0 ? (
            <p className="font-mono-pixel text-pixel-gray text-center py-8 col-span-full">
              Sin cartas
            </p>
          ) : (
            orderedCards.map((card) => (
              <div key={card.cardId} className="group">
                <div className="relative">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      width={63}
                      height={88}
                      sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 15vw"
                      className="w-full h-auto pixelated rounded border-2 border-crt-border group-hover:border-digimon-green transition-colors"
                    />
                  ) : (
                    <div className="w-full aspect-[63/88] bg-crt-dark border-2 border-crt-border flex items-center justify-center text-3xl">
                      🃏
                    </div>
                  )}
                  <span className="absolute top-1 right-1 font-pixel text-xs bg-crt-dark text-digimon-yellow border-2 border-digimon-yellow px-1.5 py-0.5">
                    ×{card.quantity}
                  </span>
                </div>
                <p
                  className="font-pixel text-[10px] text-digimon-green mt-1 truncate"
                  title={card.name}
                >
                  {card.name}
                </p>
                <p className="font-mono-pixel text-xs text-pixel-gray truncate">
                  {isLevel2Card(card)
                    ? "Digi-Egg"
                    : card.level
                      ? card.level.replace("Level ", "Lv ")
                      : card.type}
                  {" • "}
                  {card.setCode}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="pixel-card text-center" style={{ borderColor: "#008f3a" }}>
        <p className="font-mono-pixel text-pixel-gray text-sm">
          Creado:{" "}
          {format(new Date(deck.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
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
