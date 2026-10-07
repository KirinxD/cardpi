import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { roleOf } from "@/lib/roles";

/**
 * Guardia para APIs de administración.
 *
 * Devuelve `null` si el usuario está autorizado; si no, la respuesta HTTP
 * de error que hay que devolver tal cual:
 *  - 401 si no hay sesión
 *  - 403 si el usuario no es admin
 */
export function adminOnly(session: Session | null | undefined): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (roleOf(session) !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  return null;
}
