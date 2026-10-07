import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { adminOnly } from "@/lib/api-guards";

/**
 * PATCH /api/users/[id] — cambia el rol de un usuario (solo admin).
 * Body: { role: "USER" | "ADMIN" }
 *
 * Nota: el rol viaja en el JWT, así que el cambio surtirá efecto cuando el
 * usuario afectado cierre sesión y vuelva a entrar.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }

  // Un admin no puede quitarse a sí mismo el rol: evitar bloqueos accidentales.
  if (id === session?.user?.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "No puedes quitar tu propio rol de administrador" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
}
