import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const deckSchema = z.object({
  name: z.string().min(2).max(60),
  format: z.string().min(1),
  description: z.string().max(500).optional(),
  cards: z.array(z.object({
    cardId: z.string(),
    name: z.string(),
    quantity: z.number().min(1).max(4),
    isSideboard: z.boolean().default(false),
    setCode: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    level: z.string().optional(),
    cost: z.number().optional(),
    dp: z.number().optional(),
    imageUrl: z.string().optional(),
  })).min(1),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = deckSchema.parse(body);

    const deck = await prisma.deck.create({
      data: {
        name: data.name,
        format: data.format,
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