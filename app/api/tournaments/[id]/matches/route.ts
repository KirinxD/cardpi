import { auth } from "@/lib/auth";
import { adminOnly } from "@/lib/api-guards";
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

const matchInclude = {
  round: { select: { id: true, number: true, name: true } },
  player1: {
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true, userId: true } },
    },
  },
  player2: {
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true, userId: true } },
    },
  },
  winner: {
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true, userId: true } },
    },
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: id },
    include: matchInclude,
    orderBy: [{ round: { number: "asc" } }, { tableNumber: "asc" }],
  });

  return NextResponse.json(matches);
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
      include: matchInclude,
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