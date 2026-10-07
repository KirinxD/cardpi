"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  _count?: { decks: number };
}

export default function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = async (user: AdminUser) => {
    const next = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (
      next === "USER" &&
      !confirm(`¿Quitar el rol de administrador a ${user.name}?`)
    ) {
      return;
    }

    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Error al cambiar el rol");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-mono-pixel text-xs text-digimon-orange" role="alert">
          {error}
        </p>
      )}

      <div className="pixel-card overflow-x-auto" style={{ borderColor: "#008f3a" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-crt-border">
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">JUGADOR</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">EMAIL</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-20">MAZOS</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-24">ROL</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-40">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-crt-border/50">
                <td className="font-mono-pixel text-sm text-pixel-white py-2">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="text-digimon-green"> (tú)</span>
                  )}
                </td>
                <td className="font-mono-pixel text-xs text-pixel-gray py-2">
                  {user.email}
                </td>
                <td className="font-pixel text-sm text-digimon-green text-center py-2">
                  {user._count?.decks ?? 0}
                </td>
                <td className="py-2">
                  <span
                    className={`font-pixel text-xs px-2 py-1 border-2 ${
                      user.role === "ADMIN"
                        ? "text-digimon-yellow border-digimon-yellow"
                        : "text-pixel-gray border-crt-border"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-2">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={busyId === user.id}
                      className="pixel-button-secondary text-xs"
                    >
                      {busyId === user.id
                        ? "GUARDANDO..."
                        : user.role === "ADMIN"
                          ? "QUITAR ADMIN"
                          : "HACER ADMIN"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
