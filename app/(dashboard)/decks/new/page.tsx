import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import DeckBuilder from "@/components/deck-builder";

export default async function NewDeckPage() {
  const session = await auth();

  // Solo los admins reciben la lista de usuarios: el constructor muestra
  // entonces el selector de "usuario destino" para crear mazos a su nombre.
  const users = isAdmin(session)
    ? await prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : undefined;

  return <DeckBuilder users={users} />;
}
