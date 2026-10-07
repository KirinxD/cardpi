import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DeckBuilder from "@/components/deck-builder";
import { normalizeDeckCards } from "@/lib/deck-schema";

export default async function EditDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) {
    notFound();
  }
  if (deck.userId !== session.user.id) {
    redirect("/decks");
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/decks/${deck.id}`}
        className="inline-block font-pixel text-xs text-pixel-gray hover:text-digimon-green transition-colors"
      >
        ← VOLVER AL MAZO
      </Link>
      <DeckBuilder
        deck={{
          id: deck.id,
          name: deck.name,
          description: deck.description ?? "",
          // Limpia datos antiguos (sideboard, duplicados...).
          cards: normalizeDeckCards(deck.cards),
        }}
      />
    </div>
  );
}
