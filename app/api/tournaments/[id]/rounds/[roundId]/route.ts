import { auth } from "@/lib/auth";
import { adminOnly } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRoundMatchRows, matchCreateRows } from "@/lib/pairing";

const updateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  // Genera las parejas de la ronda en el servidor (solo si aún no tiene
  // combates) y la deja IN_PROGRESS.
  generatePairings: z.boolean().optional(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  const session = await auth();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id, roundId } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.generatePairings) {
      const round = await prisma.tournamentRound.findUnique({
        where: { id: roundId },
        select: {
          id: true,
          tournamentId: true,
          status: true,
          _count: { select: { matches: true } },
        },
      });

      if (!round || round.tournamentId !== id) {
        return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });
      }
      if (round._count.matches > 0) {
        return NextResponse.json(
          { error: "Esta ronda ya tiene parejas generadas" },
          { status: 400 },
        );
      }

      const rows = await buildRoundMatchRows(id);
      if (!rows) {
        return NextResponse.json(
          { error: "No hay participantes activos para emparejar" },
          { status: 400 },
        );
      }

      await prisma.$transaction([
        prisma.tournamentMatch.createMany({ data: matchCreateRows(id, roundId, rows) }),
        prisma.tournamentRound.update({
          where: { id: roundId },
          data:
            round.status === "PENDING"
              ? { status: "IN_PROGRESS", startedAt: new Date() }
              : {},
        }),
      ]);

      const full = await prisma.tournamentRound.findUnique({
        where: { id: roundId },
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
      });
      return NextResponse.json(full);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;

    const round = await prisma.tournamentRound.update({
      where: { id: roundId },
      data: updateData,
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
    });

    return NextResponse.json(round);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error updating round:", error);
    return NextResponse.json({ error: "Error al actualizar ronda" }, { status: 500 });
  }
}