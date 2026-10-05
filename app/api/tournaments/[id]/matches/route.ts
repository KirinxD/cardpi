import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const matchSchema = z.object({
  roundId: z.string().optional().nullable(),
  player1Id: z.string().optional().nullable(),
  player2Id: z.string().optional().nullable(),
  tableNumber: z.number().optional(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: id },
    include: {
      round: { select: { id: true, number: true, name: true } },
      player1: { include: { user: { select: { id: true, name: true } } } },
      player2: { include: { user: { select: { id: true, name: true } } } },
      winner: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ round: { number: "asc" } }, { tableNumber: "asc" }],
  });

  return NextResponse.json(matches);
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
    const data = matchSchema.parse(body);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const match = await prisma.tournamentMatch.create({
      data: {
        tournamentId: id,
        roundId: data.roundId || null,
        player1Id: data.player1Id || null,
        player2Id: data.player2Id || null,
        tableNumber: data.tableNumber || null,
        status: "PENDING",
      },
      include: {
        round: { select: { id: true, number: true, name: true } },
        player1: { include: { user: { select: { id: true, name: true } } } },
        player2: { include: { user: { select: { id: true, name: true } } } },
        winner: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating match:", error);
    return NextResponse.json({ error: "Error al crear combate" }, { status: 500 });
  }
}