import { auth } from "@/lib/auth";
import { adminOnly } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { roleOf } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(30),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export async function GET() {
  const session = await auth();
  const admin = roleOf(session) === "ADMIN";

  // Público/logueados: solo id y nombre (visible ya en torneos y clasificación).
  // Admin: además email y rol, para el panel de usuarios.
  const users = await prisma.user.findMany({
    select: admin
      ? { id: true, name: true, email: true, role: true }
      : { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/** POST /api/users — alta de usuarios (solo administradores). */
export async function POST(req: Request) {
  const session = await auth();
  const denied = adminOnly(session);
  if (denied) return denied;

  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role ?? "USER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos no válidos" },
        { status: 400 },
      );
    }
    console.error("Error creando usuario:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 },
    );
  }
}
