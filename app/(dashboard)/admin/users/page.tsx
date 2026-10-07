import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import AdminUsersTable from "@/components/admin-users-table";

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { decks: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pixel text-3xl text-digimon-yellow">USUARIOS</h1>
        <p className="font-mono-pixel text-pixel-gray mt-1">
          Promueve o degrada administradores. El rol surtirá efecto cuando el
          usuario cierre sesión y vuelva a entrar.
        </p>
      </div>

      <AdminUsersTable
        users={users}
        currentUserId={session?.user?.id ?? ""}
      />
    </div>
  );
}
