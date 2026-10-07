import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  placement: z.number().min(1).max(20).optional(),
  deckId: z.string().optional().nullable(),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { resultId } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const result = await prisma.tournamentResult.update({
      where: { id: resultId },
      data,
      include: {
        user: { select: { id: true, name: true } },
        deck: { select: { id: true, name: true, userId: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error updating result:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { resultId } = await params;

  try {
    await prisma.tournamentResult.delete({
      where: { id: resultId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting result:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}