import NextAuth, { CredentialsSignin } from "next-auth";
import type { User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const signUpSchema = signInSchema.extend({
  name: z.string().min(2, "Mínimo 2 caracteres").max(30),
});

/**
 * Errores de credentials que SÍ llegan al cliente: AuthJS los redirige con
 * `error=CredentialsSignin&code=<code>` y el formulario los traduce con
 * `lib/auth-errors.ts`. Cualquier otra excepción genérica acaba en
 * `error=Configuration` (lo que antes se mostraba como "configuración").
 */
class InvalidCredentials extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}

class EmailAlreadyRegistered extends CredentialsSignin {
  code = "EMAIL_ALREADY_REGISTERED";
}

class InvalidSignupData extends CredentialsSignin {
  code = "INVALID_SIGNUP_DATA";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        name: { label: "Nombre", type: "text" },
      },
      authorize: async (credentials) => {
        const { email, password, name } = credentials as {
          email: string;
          password: string;
          name?: string;
        };

        if (name) {
          const validated = signUpSchema.safeParse({ email, password, name });
          if (!validated.success) {
            throw new InvalidSignupData();
          }

          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            throw new EmailAlreadyRegistered();
          }

          const passwordHash = await bcrypt.hash(password, 12);
          try {
            const user = await prisma.user.create({
              data: { email, name, passwordHash },
            });
            return { id: user.id, email: user.email, name: user.name, role: user.role } as User;
          } catch (error) {
            // Carrera con otro registro simultáneo del mismo email (P2002).
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              (error as { code?: string }).code === "P2002"
            ) {
              throw new EmailAlreadyRegistered();
            }
            throw error;
          }
        }

        const validated = signInSchema.safeParse({ email, password });
        if (!validated.success) {
          throw new InvalidCredentials();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new InvalidCredentials();
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new InvalidCredentials();
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role } as User;
      },
    }),
  ],
});
