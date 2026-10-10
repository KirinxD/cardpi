import { auth } from "@/lib/auth";
import { adminOnly } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRoundMatchRows, matchCreateRows } from "@/lib/pairing";

const roundSchema = z.object({
  number: z.number().min(1),
  name: z.string().optional(),
  // Crea la ronda ya emparejada con todos los jugadores activos y la deja
  // IN_PROGRESS, lista para jugar.
  autoPair: z.boolean().optional(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

const roundInclude = {
  matches: {
    include: {
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
    },
    orderBy: { tableNumber: "asc" as const },
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rounds = await prisma.tournamentRound.findMany({
    where: { tournamentId: id },
    include: roundInclude,
    orderBy: { number: "asc" },
  });

  return NextResponse.json(rounds);
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

    if (data.autoPair) {
      // Ronda completa de una vez: empareja a todos los jugadores activos
      // (bye si hay número impar) y la deja en juego.
      const rows = await buildRoundMatchRows(id);
      if (!rows) {
        return NextResponse.json(
          { error: "No hay participantes activos para emparejar" },
          { status: 400 },
        );
      }

      const round = await prisma.$transaction(async (tx) => {
        const created = await tx.tournamentRound.create({
          data: {
            tournamentId: id,
            number: data.number,
            name: data.name || `Ronda ${data.number}`,
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });
        await tx.tournamentMatch.createMany({
          data: matchCreateRows(id, created.id, rows),
        });
        return created;
      });

      const full = await prisma.tournamentRound.findUnique({
        where: { id: round.id },
        include: roundInclude,
      });
      return NextResponse.json(full);
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
    // Carrera con otra creación simultánea del mismo número (P2002).
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Esta ronda ya existe" }, { status: 400 });
    }
    console.error("Error creating round:", error);
    return NextResponse.json({ error: "Error al crear ronda" }, { status: 500 });
  }
}