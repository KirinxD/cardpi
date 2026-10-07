import { auth } from "@/lib/auth";
import { adminOnly } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const resultSchema = z.object({
  userId: z.string().min(1),
  placement: z.number().min(1).max(20),
  deckId: z.string().optional().nullable(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const results = await prisma.tournamentResult.findMany({
    where: { tournamentId: id },
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true, userId: true } },
    },
    orderBy: { placement: "asc" },
  });

  return NextResponse.json(results);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = resultSchema.parse(body);

    const existing = await prisma.tournamentResult.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId: data.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este jugador ya tiene resultado en este torneo" },
        { status: 400 }
      );
    }

    const result = await prisma.tournamentResult.create({
      data: {
        tournamentId: id,
        userId: data.userId,
        placement: data.placement,
        deckId: data.deckId || null,
      },
      include: {
        user: { select: { id: true, name: true } },
        deck: { select: { id: true, name: true, userId: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating result:", error);
    return NextResponse.json({ error: "Error al crear resultado" }, { status: 500 });
  }
}