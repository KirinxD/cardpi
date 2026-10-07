import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * Proxy (antes "middleware" en Next < 16): se ejecuta antes de cada request.
 * Usa la config edge-safe de `lib/auth.config.ts` (sin Prisma ni bcrypt).
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isOnAuth = path.startsWith("/auth");

  // Zonas privadas: la lista y la creación de mazos, la edición de un mazo,
  // los posts nuevos y el panel de administración.
  //
  // Quedan PÚBLICOS (sin login):
  //  - /tournaments, /standings y sus detalles
  //  - la ficha de cada mazo (/decks/<id>) para ver los mazos de los jugadores
  const isProtected =
    path === "/decks" ||
    path === "/decks/new" ||
    (path.startsWith("/decks/") && path.endsWith("/edit")) ||
    path === "/tournaments/new" ||
    path.startsWith("/posts/new") ||
    path.startsWith("/admin");

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${path}`, req.nextUrl)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.png$).*)",
  ],
};
