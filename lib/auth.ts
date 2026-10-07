import NextAuth from "next-auth";
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

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
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
            throw new Error(getZodErrorMessage(validated.error));
          }

          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            throw new Error("Este email ya está registrado");
          }

          const passwordHash = await bcrypt.hash(password, 12);
          const user = await prisma.user.create({
            data: { email, name, passwordHash },
          });

          return { id: user.id, email: user.email, name: user.name, role: user.role } as User;
        }

        const validated = signInSchema.safeParse({ email, password });
        if (!validated.success) {
          throw new Error(getZodErrorMessage(validated.error));
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new Error("Contraseña incorrecta");
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role } as User;
      },
    }),
  ],
});
