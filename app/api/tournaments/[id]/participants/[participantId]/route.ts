import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  deckId: z.string().optional().nullable(),
  seed: z.number().optional(),
  dropped: z.boolean().optional(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { participantId } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const participant = await prisma.tournamentParticipant.update({
      where: { id: participantId },
      data,
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
    console.error("Error updating participant:", error);
    return NextResponse.json({ error: "Error al actualizar participante" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, participantId } = await params;

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    if (tournament.status !== "REGISTRATION") {
      return NextResponse.json({ error: "No se puede desinscribir, el torneo ya empezó" }, { status: 400 });
    }

    await prisma.tournamentParticipant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json({ error: "Error al desinscribir participante" }, { status: 500 });
  }
}