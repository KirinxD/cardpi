import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSwissStandings } from "@/lib/standings";

/** GET /api/tournaments/[id]/standings — clasificación suiza (pública). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(await getSwissStandings(id));
}
