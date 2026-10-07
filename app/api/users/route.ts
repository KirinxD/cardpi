import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { roleOf } from "@/lib/roles";

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
