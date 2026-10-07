"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AdminDeck {
  id: string;
  name: string;
  ownerName: string;
  tournamentName: string | null;
  updatedAt: string;
}

export default function AdminDecksTable({ decks }: { decks: AdminDeck[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removeDeck = async (deck: AdminDeck) => {
    if (!confirm(`¿Eliminar el mazo "${deck.name}" de ${deck.ownerName}?`)) {
      return;
    }

    setBusyId(deck.id);
    setError(null);
    try {
      const res = await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Error al borrar el mazo");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setBusyId(null);
    }
  };

  if (decks.length === 0) {
    return (
      <div className="pixel-card text-center py-12" style={{ borderColor: "#008f3a" }}>
        <p className="font-mono-pixel text-pixel-gray">Todavía no hay mazos</p>
      </div>
    );
  }

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
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">MAZO</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">JUGADOR</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">TORNEO</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-32">ACTUALIZADO</th>
              <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-56">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((deck) => (
              <tr key={deck.id} className="border-b border-crt-border/50">
                <td className="font-mono-pixel text-sm text-pixel-white py-2">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="text-digimon-green hover:underline"
                  >
                    {deck.name}
                  </Link>
                </td>
                <td className="font-mono-pixel text-xs text-pixel-gray py-2">
                  {deck.ownerName}
                </td>
                <td className="font-mono-pixel text-xs text-pixel-gray py-2">
                  {deck.tournamentName ?? "—"}
                </td>
                <td className="font-mono-pixel text-xs text-pixel-gray py-2">
                  {format(new Date(deck.updatedAt), "dd MMM yyyy", { locale: es })}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/decks/${deck.id}/edit`} className="pixel-button text-xs">
                      EDITAR
                    </Link>
                    <button
                      onClick={() => removeDeck(deck)}
                      disabled={busyId === deck.id}
                      className="pixel-button-secondary text-xs"
                    >
                      {busyId === deck.id ? "..." : "BORRAR"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
