import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { roundId } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

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