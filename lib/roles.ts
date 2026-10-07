import type { Session } from "next-auth";

export type Role = "USER" | "ADMIN";

/**
 * Rol del usuario de la sesión.
 * Devuelve `undefined` si no hay sesión o si el token es antiguo (se creó
 * antes de existir el campo rol), lo que equivale a USER.
 */
export function roleOf(session: Session | null | undefined): Role | undefined {
  return (session?.user as { role?: Role } | undefined)?.role;
}

/** ¿Es la sesión de un administrador? */
export function isAdmin(session: Session | null | undefined): boolean {
  return roleOf(session) === "ADMIN";
}
