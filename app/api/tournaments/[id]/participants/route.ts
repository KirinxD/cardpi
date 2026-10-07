import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const participantSchema = z.object({
  userId: z.string().min(1),
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

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: id },
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true } },
    },
    orderBy: { seed: "asc" },
  });

  return NextResponse.json(participants);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = participantSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    if (tournament.status !== "REGISTRATION") {
      return NextResponse.json({ error: "El torneo ya no acepta inscripciones" }, { status: 400 });
    }

    const existing = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: id, userId: data.userId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Este jugador ya está inscrito" }, { status: 400 });
    }

    const maxSeed = await prisma.tournamentParticipant.aggregate({
      where: { tournamentId: id },
      _max: { seed: true },
    });

    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: id,
        userId: data.userId,
        deckId: data.deckId || null,
        seed: (maxSeed._max.seed || 0) + 1,
      },
      include: {
        user: { select: { id: true, name: true } },
        deck: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error adding participant:", error);
    return NextResponse.json({ error: "Error al inscribir participante" }, { status: 500 });
  }
}