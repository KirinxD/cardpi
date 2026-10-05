"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

const resultSchema = z.object({
  userId: z.string().min(1, "Selecciona un jugador"),
  placement: z.number().min(1).max(20),
  deckId: z.string().optional(),
});

type ResultForm = z.infer<typeof resultSchema>;

interface User {
  id: string;
  name: string;
}

interface Deck {
  id: string;
  name: string;
  userId: string;
}

interface TournamentResult {
  id: string;
  placement: number;
  user: User;
  deck: Deck | null;
}

export default function TournamentResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlacement, setEditPlacement] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ResultForm>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      userId: "",
      placement: 1,
      deckId: "",
    },
  });

  const watchedUserId = useWatch({ control: useForm().control, name: "userId" });

  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    params.then((p) => setTournamentId(p.id));
  }, [params]);

  const fetchData = async () => {
    if (!tournamentId) return;
    try {
      const [usersRes, decksRes, resultsRes] = await Promise.all([
        fetch("/api/users"),
        fetch(`/api/decks?userId=all`),
        fetch(`/api/tournaments/${tournamentId}/results`),
      ]);
      setUsers(await usersRes.json());
      setDecks(await decksRes.json());
      setResults(await resultsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const userDecks = (userId: string) => decks.filter((d) => d.userId === userId);

  const onSubmit = async (data: ResultForm) => {
    if (!tournamentId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        reset({ userId: "", placement: results.length + 1, deckId: "" });
        fetchData();
      } else {
        alert("Error al guardar resultado");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePlacement = async (resultId: string, newPlacement: number) => {
    if (!tournamentId) return;
    try {
      await fetch(`/api/tournaments/${tournamentId}/results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placement: newPlacement }),
      });
      fetchData();
    } catch {
      alert("Error al actualizar");
    }
  };

  const deleteResult = async (resultId: string) => {
    if (!tournamentId) return;
    if (!confirm("¿Eliminar este resultado?")) return;
    try {
      await fetch(`/api/tournaments/${tournamentId}/results/${resultId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`/tournaments/${tournamentId}`} className="inline-block mb-4">
        <span className="font-pixel text-xs text-pixel-gray hover:text-digimon-orange transition-colors">
          ← VOLVER AL TORNEO
        </span>
      </Link>

      <h1 className="font-pixel text-3xl text-digimon-orange">GESTIONAR RESULTADOS</h1>

      {isLoading ? (
        <div className="pixel-card text-center py-12" style={{ borderColor: "#cc5400" }}>
          <p className="font-mono-pixel text-pixel-gray">Cargando...</p>
        </div>
      ) : (
        <>
          <div className="pixel-card space-y-4" style={{ borderColor: "#cc5400" }}>
            <h2 className="font-pixel text-lg text-digimon-orange border-b-2 border-crt-border pb-2">
              AÑADIR RESULTADO
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-pixel text-xs text-digimon-orange block mb-2">JUGADOR</label>
                  <select {...register("userId")} className="pixel-input" onChange={(e) => setValue("deckId", "")}>
                    <option value="">Seleccionar...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {errors.userId && <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.userId.message}</p>}
                </div>
                <div>
                  <label className="font-pixel text-xs text-digimon-orange block mb-2">POSICIÓN</label>
                  <input
                    {...register("placement", { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="20"
                    className="pixel-input"
                  />
                  {errors.placement && <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.placement.message}</p>}
                </div>
                <div>
                  <label className="font-pixel text-xs text-digimon-orange block mb-2">MAZO (OPCIONAL)</label>
                  <select {...register("deckId")} className="pixel-input">
                    <option value="">Sin mazo</option>
                    {userDecks(watchedUserId).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="pixel-button-secondary w-full" disabled={isSubmitting}>
                {isSubmitting ? "GUARDANDO..." : "AÑADIR RESULTADO"}
              </button>
            </form>
          </div>

          <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
            <h2 className="font-pixel text-lg text-digimon-green mb-4">CLASIFICACIÓN ACTUAL</h2>
            {results.length === 0 ? (
              <p className="font-mono-pixel text-pixel-gray text-center py-8">No hay resultados</p>
            ) : (
              <div className="space-y-2">
                {results
                  .sort((a, b) => a.placement - b.placement)
                  .map((result) => (
                    <div
                      key={result.id}
                      className="pixel-card flex items-center justify-between gap-4 p-3"
                      style={{ borderColor: editingId === result.id ? "#ff6b00" : "#004411" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-pixel text-xl text-digimon-yellow w-12 text-center">
                          {result.placement}º
                        </span>
                        <div>
                          <p className="font-pixel text-sm text-digimon-green">{result.user.name}</p>
                          {result.deck && (
                            <p className="font-mono-pixel text-xs text-pixel-gray">
                              Mazo: {result.deck.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {editingId === result.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={editPlacement}
                            onChange={(e) => setEditPlacement(Number(e.target.value))}
                            className="pixel-input w-20 text-center"
                          />
                          <button
                            onClick={() => updatePlacement(result.id, editPlacement)}
                            className="pixel-button text-xs"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="pixel-button-secondary text-xs"
                          >
                            CANCELAR
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditPlacement(result.placement);
                              setEditingId(result.id);
                            }}
                            className="pixel-button text-xs"
                          >
                            EDITAR POS
                          </button>
                          <button
                            onClick={() => deleteResult(result.id)}
                            className="pixel-button-secondary text-xs"
                          >
                            ELIMINAR
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}