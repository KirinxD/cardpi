import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deckSchema, getZodErrorMessage, validateDeckComposition } from "@/lib/deck-schema";
import { roleOf } from "@/lib/roles";
import { z } from "zod";

/** Dueño o admin: los admins pueden editar/borrar mazos de cualquier usuario. */
function canManage(deckUserId: string, sessionUserId: string, admin: boolean): boolean {
  return deckUserId === sessionUserId || admin;
}

/**
 * PATCH /api/decks/[id] — actualiza un mazo existente (dueño o admin).
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
  if (!canManage(deck.userId, session.user.id, roleOf(session) === "ADMIN")) {
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

/** DELETE /api/decks/[id] — borra un mazo (dueño o admin). */
export async function DELETE(
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
  if (!canManage(deck.userId, session.user.id, roleOf(session) === "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await prisma.deck.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deck:", error);
    return NextResponse.json({ error: "Error al borrar el mazo" }, { status: 500 });
  }
}
