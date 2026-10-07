import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deckSchema, getZodErrorMessage, validateDeckComposition } from "@/lib/deck-schema";
import { z } from "zod";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = deckSchema.parse(body);

    const composition = validateDeckComposition(data.cards);
    if (!composition.valid) {
      return NextResponse.json({ error: composition.error }, { status: 400 });
    }

    const deck = await prisma.deck.create({
      data: {
        name: data.name,
        description: data.description,
        cards: data.cards,
        userId: session.user.id,
      },
    });

    return NextResponse.json(deck);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating deck:", error);
    return NextResponse.json({ error: "Error al crear el mazo" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId === "all") {
    const decks = await prisma.deck.findMany({
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(decks);
  }

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: {
      tournament: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(decks);
}
