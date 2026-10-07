import type { NextAuthConfig } from "next-auth";

/**
 * Configuración de NextAuth apta para el runtime de proxy (edge).
 *
 * IMPORTANTE: este archivo NO puede importar Prisma, bcrypt ni nada que
 * sólo funcione en Node, porque se ejecuta en `proxy.ts` (antes middleware).
 * La parte que necesita base de datos vive en `lib/auth.ts`.
 */
export const authConfig = {
  // Fuera de Vercel (self-host / local) AuthJS exige declarar el host de
  // confianza; sin esto todas las rutas /api/auth/* devuelven UntrustedHost.
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Rol (USER/ADMIN) viaja del `authorize` al token y de ahí a la sesión.
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (session.user && token.role) {
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
