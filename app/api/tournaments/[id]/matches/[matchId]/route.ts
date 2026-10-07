import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  player1Score: z.number().min(0).max(3).optional(),
  player2Score: z.number().min(0).max(3).optional(),
  winnerId: z.string().optional().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DRAW", "BYE"]).optional(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { matchId } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.player1Score !== undefined) updateData.player1Score = data.player1Score;
    if (data.player2Score !== undefined) updateData.player2Score = data.player2Score;
    if (data.winnerId !== undefined) updateData.winnerId = data.winnerId || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;

    // Auto-complete if scores are set
    if (data.player1Score !== undefined && data.player2Score !== undefined) {
      if (data.player1Score > data.player2Score) {
        const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
        if (match?.player1Id) updateData.winnerId = match.player1Id;
      } else if (data.player2Score > data.player1Score) {
        const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
        if (match?.player2Id) updateData.winnerId = match.player2Id;
      } else {
        updateData.status = "DRAW";
      }
      if (!updateData.status) updateData.status = "COMPLETED";
      updateData.completedAt = new Date();
    }

    const match = await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: updateData,
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
    console.error("Error updating match:", error);
    return NextResponse.json({ error: "Error al actualizar combate" }, { status: 500 });
  }
}