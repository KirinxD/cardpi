import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const tournamentSchema = z.object({
  name: z.string().min(2).max(80),
  date: z.string().min(1),
  season: z.string().min(1),
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
    const data = tournamentSchema.parse(body);

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        date: new Date(data.date),
        season: data.season,
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating tournament:", error);
    return NextResponse.json({ error: "Error al crear el torneo" }, { status: 500 });
  }
}

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: { select: { results: true, decks: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(tournaments);
}