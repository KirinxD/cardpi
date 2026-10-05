import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(5).max(100),
  content: z.string().min(10),
  type: z.enum(["EXPANSION", "PREDICTION", "GENERAL"]),
});

function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}

export async function GET() {
  const posts = await prisma.post.findMany({
    include: {
      author: { select: { name: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        authorId: session.user.id,
      },
      include: {
        author: { select: { name: true, id: true } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Error al crear el post" }, { status: 500 });
  }
}