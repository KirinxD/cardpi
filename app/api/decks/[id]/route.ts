import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deckSchema, getZodErrorMessage, validateDeckComposition } from "@/lib/deck-schema";
import { z } from "zod";

/**
 * PATCH /api/decks/[id] — actualiza un mazo existente (solo su propietario).
 * El payload es el mismo que usa POST /api/decks (ver lib/deck-schema.ts).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!deck) {
    return NextResponse.json({ error: "Mazo no encontrado" }, { status: 404 });
  }
  if (deck.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = deckSchema.parse(body);

    const composition = validateDeckComposition(data.cards);
    if (!composition.valid) {
      return NextResponse.json({ error: composition.error }, { status: 400 });
    }

    const updated = await prisma.deck.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        cards: data.cards,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error updating deck:", error);
    return NextResponse.json({ error: "Error al guardar el mazo" }, { status: 500 });
  }
}
