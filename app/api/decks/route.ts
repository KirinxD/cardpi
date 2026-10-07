import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deckSchema, getZodErrorMessage, validateDeckComposition } from "@/lib/deck-schema";
import { roleOf } from "@/lib/roles";
import { z } from "zod";

const publicDeckSelect = {
  id: true,
  name: true,
  userId: true,
  user: { select: { id: true, name: true } },
} as const;

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

    // Un admin puede crear el mazo a nombre de otro usuario (`targetUserId`).
    let userId = session.user.id;
    if (body.targetUserId && body.targetUserId !== userId) {
      if (roleOf(session) !== "ADMIN") {
        return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
      }
      const target = await prisma.user.findUnique({
        where: { id: String(body.targetUserId) },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ error: "Usuario destino no encontrado" }, { status: 404 });
      }
      userId = target.id;
    }

    const deck = await prisma.deck.create({
      data: {
        name: data.name,
        description: data.description,
        cards: data.cards,
        userId,
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
  const admin = roleOf(session) === "ADMIN";

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // Catálogo completo (con las cartas) solo para admins: lo usan el cuadro,
  // la gestión de resultados y el panel.
  if (userId === "all") {
    const decks = admin
      ? await prisma.deck.findMany({
          include: { user: { select: { id: true, name: true } } },
          orderBy: { updatedAt: "desc" },
        })
      : await prisma.deck.findMany({
          select: publicDeckSelect,
          orderBy: { updatedAt: "desc" },
        });
    return NextResponse.json(decks);
  }

  if (!session?.user?.id) {
    // Visitante anónimo: solo un catálogo básico (sin las cartas) del jugador
    // solicitado, o la lista vacía cuando no se pide nada concreto.
    const decks = userId
      ? await prisma.deck.findMany({
          where: { userId },
          select: publicDeckSelect,
          orderBy: { updatedAt: "desc" },
        })
      : [];
    return NextResponse.json(decks);
  }

  const ownDecks = !userId || userId === session.user.id;
  if (!ownDecks && !admin) {
    // Otro usuario: mismos datos básicos; la ficha completa es pública igual.
    const decks = await prisma.deck.findMany({
      where: { userId },
      select: publicDeckSelect,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(decks);
  }

  const decks = await prisma.deck.findMany({
    where: { userId: userId ?? session.user.id },
    include: {
      tournament: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(decks);
}
