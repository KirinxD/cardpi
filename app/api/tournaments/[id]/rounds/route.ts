import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const roundSchema = z.object({
  number: z.number().min(1),
  name: z.string().optional(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rounds = await prisma.tournamentRound.findMany({
    where: { tournamentId: id },
    include: {
      matches: {
        include: {
          player1: { include: { user: { select: { id: true, name: true } } } },
          player2: { include: { user: { select: { id: true, name: true } } } },
          winner: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { tableNumber: "asc" },
      },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(rounds);
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
    const data = roundSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true, type: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const existingRound = await prisma.tournamentRound.findUnique({
      where: { tournamentId_number: { tournamentId: id, number: data.number } },
    });

    if (existingRound) {
      return NextResponse.json({ error: "Esta ronda ya existe" }, { status: 400 });
    }

    const round = await prisma.tournamentRound.create({
      data: {
        tournamentId: id,
        number: data.number,
        name: data.name || `Ronda ${data.number}`,
        status: "PENDING",
      },
    });

    return NextResponse.json(round);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating round:", error);
    return NextResponse.json({ error: "Error al crear ronda" }, { status: 500 });
  }
}