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
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth");
  const isProtected = ["/decks", "/tournaments", "/standings", "/posts/new"].some(
    (path) => req.nextUrl.pathname.startsWith(path)
  );

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${req.nextUrl.pathname}`, req.nextUrl)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.png$).*)",
  ],
};
