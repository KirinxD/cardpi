import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

/**
 * Guardia de las páginas de /admin. Debe llamarse ANTES de consultar datos.
 *
 * El layout de /admin también redirige, pero React puede renderizar layout y
 * página en paralelo: lanzando aquí dentro de la propia página nos aseguramos
 * de que no se consulta ni se serializa ningún dato para usuarios que no son
 * administradores.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }
  if (!isAdmin(session)) {
    redirect("/");
  }
  return session;
}
