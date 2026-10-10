"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/roles";

interface User {
  id: string;
  name: string;
}

interface Deck {
  id: string;
  name: string;
  userId: string;
}

interface Participant {
  id: string;
  seed: number;
  dropped: boolean;
  user: User;
  deck: Deck | null;
}

interface Match {
  id: string;
  roundId: string | null;
  round: { number: number; name: string } | null;
  tableNumber: number | null;
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
  player1Score: number;
  player2Score: number;
  status: string;
}

interface Round {
  id: string;
  number: number;
  name: string;
  status: string;
  matches: Match[];
}

interface LoadedData {
  participants: Participant[];
  rounds: Round[];
  users: User[];
  decks: Deck[];
}

export default function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"participants" | "bracket" | "rounds">("participants");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ userId: "", deckId: "" });
  // Marcadores en edición local: no se guardan hasta pulsar CONFIRMAR.
  const [drafts, setDrafts] = useState<Record<string, { p1: string; p2: string }>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const { id: tournamentId } = use(params);

  // La página es de solo lectura para visitantes; la gestión es de admin.
  const { data: session } = useSession();
  const canManage = isAdmin(session);

  const loadData = useCallback(async (): Promise<LoadedData> => {
    const [participantsRes, roundsRes, usersRes, decksRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/participants`),
      fetch(`/api/tournaments/${tournamentId}/rounds`),
      fetch("/api/users"),
      fetch(`/api/decks?userId=all`),
    ]);
    return {
      participants: (await participantsRes.json()) as Participant[],
      rounds: (await roundsRes.json()) as Round[],
      users: (await usersRes.json()) as User[],
      decks: (await decksRes.json()) as Deck[],
    };
  }, [tournamentId]);

  const applyData = useCallback((data: LoadedData) => {
    setParticipants(data.participants);
    setRounds(data.rounds);
    setUsers(data.users);
    setDecks(data.decks);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      applyData(await loadData());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadData, applyData]);

  useEffect(() => {
    let active = true;

    loadData()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((error) => console.error("Error fetching data:", error))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadData, applyData]);

  const addParticipant = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newParticipant),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewParticipant({ userId: "", deckId: "" });
        fetchData();
      } else {
        alert("Error al añadir participante");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (!confirm("¿Desinscribir a este jugador?")) return;
    try {
      await fetch(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
        method: "DELETE",
      });
      fetchData();
    } catch {
      alert("Error de conexión");
    }
  };

  const generateRound = async (roundNumber: number) => {
    // Si hay rondas sin finalizar, avisamos: los emparejamientos usarán la
    // clasificación actual (aún incompleta).
    if (
      rounds.some((r) => r.status !== "COMPLETED") &&
      !confirm(
        "Hay rondas sin finalizar. Los emparejamientos usarán la clasificación actual. ¿Crear la ronda de todos modos?",
      )
    ) {
      return;
    }
    try {
      // El servidor crea la ronda completa: empareja a todos los jugadores
      // activos de una vez (bye si hay número impar) y la deja IN_PROGRESS.
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: roundNumber,
          name: `Ronda ${roundNumber}`,
          autoPair: true,
        }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.error || "Error al crear la ronda");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const generatePairings = async (roundId: string) => {
    // Para rondas existentes aún sin combates: el servidor genera las parejas.
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatePairings: true }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.error || "Error al generar las parejas");
      }
    } catch {
      alert("Error de conexión");
    }
  };

  // Los marcadores se escriben en local; solo se guardan al confirmar.
  const getDraft = (match: Match) => {
    const saved = drafts[match.id];
    if (saved) return saved;
    const finished =
      match.status === "COMPLETED" || match.status === "DRAW" || match.status === "BYE";
    return {
      p1: finished ? String(match.player1Score) : "",
      p2: finished ? String(match.player2Score) : "",
    };
  };

  const setDraft = (match: Match, side: "p1" | "p2", value: string) => {
    if (value !== "" && !/^[0-3]$/.test(value)) return;
    const current = getDraft(match);
    setDrafts((prev) => ({ ...prev, [match.id]: { ...current, [side]: value } }));
  };

  const confirmResult = async (match: Match) => {
    const draft = getDraft(match);
    if (draft.p1 === "" || draft.p2 === "") return;

    setSavingMatchId(match.id);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Score: Number(draft.p1),
          player2Score: Number(draft.p2),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error || "Error al guardar el resultado");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[match.id];
        return next;
      });
      await fetchData();
    } catch {
      alert("Error de conexión");
    } finally {
      setSavingMatchId(null);
    }
  };

  const startRound = async (roundId: string) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS", startedAt: new Date().toISOString() }),
      });
      fetchData();
    } catch {
      alert("Error de conexión");
    }
  };

  const completeRound = async (roundId: string) => {
    try {
      await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", completedAt: new Date().toISOString() }),
      });
      fetchData();
    } catch {
      alert("Error de conexión");
    }
  };

  const getStandings = () => {
    // Calculate Swiss standings based on match results
    const scores = new Map<string, { wins: number; draws: number; losses: number; points: number }>();
    
    participants.forEach(p => {
      scores.set(p.id, { wins: 0, draws: 0, losses: 0, points: 0 });
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
        if ((match.status === "COMPLETED" || match.status === "DRAW") && match.player1 && match.player2) {
          const p1Stats = scores.get(match.player1.id)!;
          const p2Stats = scores.get(match.player2.id)!;
          
          if (match.player1Score > match.player2Score) {
            p1Stats.wins++; p1Stats.points += 3;
            p2Stats.losses++;
          } else if (match.player2Score > match.player1Score) {
            p2Stats.wins++; p2Stats.points += 3;
            p1Stats.losses++;
          } else {
            p1Stats.draws++; p1Stats.points += 1;
            p2Stats.draws++; p2Stats.points += 1;
          }
        } else if (match.status === "BYE" && match.player1) {
          // Bye counts as 2-0 win
          const p1Stats = scores.get(match.player1.id)!;
          p1Stats.wins++; p1Stats.points += 3;
        }
      });
    });

    return participants
      .filter(p => !p.dropped)
      .map(p => ({ ...p, ...scores.get(p.id)! }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="text-digimon-green font-pixel text-lg animate-pulse">CARGANDO BRACKET...</div>
      </div>
    );
  }

  const standings = getStandings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href={`/tournaments/${tournamentId}`} className="font-pixel text-xs text-pixel-gray hover:text-digimon-orange transition-colors mb-2 inline-block">
            ← VOLVER AL TORNEO
          </Link>
          <h1 className="font-pixel text-3xl text-digimon-orange">BRACKET / ELIMINATORIAS</h1>
        </div>
      </div>

      <div className="flex gap-2 border-b-2 border-crt-border pb-2">
        {[
          { id: "participants", label: "👥 INSCRIPCIONES" },
          { id: "rounds", label: "🔄 RONDAS" },
          { id: "bracket", label: "🏆 CLASIFICACIÓN" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 font-pixel text-xs transition-colors ${
              activeTab === tab.id
                ? "text-digimon-green border-b-2 border-digimon-green"
                : "text-pixel-gray hover:text-digimon-green"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PARTICIPANTS TAB */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-pixel text-lg text-digimon-green">PARTICIPANTES ({participants.length})</h2>
            {canManage && (
              <button onClick={() => setShowAddModal(true)} className="pixel-button-secondary text-xs">
                + INSCRIBIR JUGADOR
              </button>
            )}
          </div>

          <div className="pixel-card max-h-96 overflow-y-auto" style={{ borderColor: "#cc5400" }}>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-crt-border">
                  <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-12">SEED</th>
                  <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">JUGADOR</th>
                  <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left">MAZO</th>
                  <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-24">ESTADO</th>
                  {canManage && (
                    <th className="font-pixel text-xs text-digimon-yellow pb-2 text-left w-24">ACCIONES</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="font-mono-pixel text-pixel-gray text-center py-8">
                      Sin participantes inscritos
                    </td>
                  </tr>
                ) : (
                  participants.map(p => (
                    <tr key={p.id} className="border-b border-crt-border/50">
                      <td className="font-pixel text-sm text-digimon-yellow py-2">{p.seed}</td>
                      <td className="font-pixel text-sm text-digimon-green py-2">{p.user.name}</td>
                      <td className="font-mono-pixel text-xs text-pixel-white py-2">
                        {p.deck ? p.deck.name : "Sin mazo asignado"}
                      </td>
                      <td className="py-2">
                        {p.dropped ? (
                          <span className="font-mono-pixel text-xs text-digimon-orange">DROP</span>
                        ) : (
                          <span className="font-mono-pixel text-xs text-digimon-green">ACTIVO</span>
                        )}
                      </td>
                      <td className="py-2">
                        {canManage && (
                          <button
                            onClick={() => removeParticipant(p.id)}
                            className="pixel-button-secondary text-xs"
                          >
                            ELIMINAR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showAddModal && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="pixel-card w-full max-w-md" style={{ borderColor: "#ff6b00" }}>
                <h3 className="font-pixel text-lg text-digimon-orange mb-4">INSCRIBIR JUGADOR</h3>
                <div className="space-y-4">
                  <div>
                    <label className="font-pixel text-xs text-digimon-orange block mb-2">JUGADOR</label>
                    <select
                      value={newParticipant.userId}
                      onChange={(e) => setNewParticipant({ ...newParticipant, userId: e.target.value })}
                      className="pixel-input"
                    >
                      <option value="">Seleccionar...</option>
                      {users.filter(u => !participants.some(p => p.user.id === u.id)).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-pixel text-xs text-digimon-orange block mb-2">MAZO (OPCIONAL)</label>
                    <select
                      value={newParticipant.deckId}
                      onChange={(e) => setNewParticipant({ ...newParticipant, deckId: e.target.value })}
                      className="pixel-input"
                    >
                      <option value="">Sin mazo</option>
                      {decks.filter(d => d.userId === newParticipant.userId).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addParticipant} className="pixel-button flex-1">CONFIRMAR</button>
                    <button onClick={() => setShowAddModal(false)} className="pixel-button-secondary flex-1">CANCELAR</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROUNDS TAB */}
      {activeTab === "rounds" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-pixel text-lg text-digimon-green">GESTIÓN DE RONDAS</h2>
              <p className="font-mono-pixel text-xs text-pixel-gray">
                «NUEVA RONDA» empareja automáticamente a todos los jugadores activos
                (bye si hay número impar) y la deja lista para jugar.
              </p>
            </div>
            {canManage && (
              <button onClick={() => generateRound(rounds.length + 1)} className="pixel-button text-xs">
                + NUEVA RONDA
              </button>
            )}
          </div>

          <div className="space-y-4">
            {rounds.length === 0 ? (
              <div className="pixel-card text-center py-12" style={{ borderColor: "#008f3a" }}>
                <p className="font-mono-pixel text-pixel-gray">No hay rondas creadas</p>
              </div>
            ) : (
              rounds.map(round => (
                <div key={round.id} className="pixel-card" style={{ borderColor: "#008f3a" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="font-pixel text-lg text-digimon-green">{round.name}</h3>
                      <span className={`font-pixel text-xs px-2 py-1 border-2 ${
                        round.status === "COMPLETED" ? "text-digimon-green border-digimon-green" :
                        round.status === "IN_PROGRESS" ? "text-digimon-orange border-digimon-orange" :
                        "text-pixel-gray border-crt-border"
                      }`}>
                        {round.status}
                      </span>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        {round.status === "PENDING" && (
                          <>
                            <button onClick={() => startRound(round.id)} className="pixel-button text-xs">
                              INICIAR
                            </button>
                            {round.matches.length === 0 && (
                              <button onClick={() => generatePairings(round.id)} className="pixel-button-secondary text-xs">
                                GENERAR PAREJAS
                              </button>
                            )}
                          </>
                        )}
                        {round.status === "IN_PROGRESS" && (
                          <button onClick={() => completeRound(round.id)} className="pixel-button text-xs">
                            FINALIZAR RONDA
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {round.matches.length === 0 ? (
                      <p className="font-mono-pixel text-pixel-gray text-center py-4">Sin combates generados</p>
                    ) : (
                      round.matches.map(match => (
                        <div key={match.id} className="pixel-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3" style={{ borderColor: "#004411" }}>
                          <div className="flex items-center gap-4 min-w-0">
                            {match.tableNumber && (
                              <span className="font-pixel text-lg text-digimon-yellow w-10 text-center">M{match.tableNumber}</span>
                            )}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-right min-w-[150px]">
                                <p className={`font-pixel text-sm ${match.winner?.id === match.player1?.id ? "text-digimon-yellow" : "text-digimon-green"}`}>
                                  {match.player1?.user.name || "BYE"}
                                </p>
                                <p className="font-mono-pixel text-xs text-pixel-gray">{match.player1?.deck?.name || "Sin mazo"}</p>
                              </div>
                              {!match.player2 ? (
                                // Bye: no se juega ni se introduce resultado.
                                <span className="font-pixel text-sm text-digimon-yellow px-3">
                                  ⭐ BYE (3 PTS)
                                </span>
                              ) : canManage ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={getDraft(match).p1}
                                    onChange={(e) => setDraft(match, "p1", e.target.value)}
                                    placeholder="–"
                                    disabled={savingMatchId === match.id}
                                    className="pixel-input w-16 text-center font-pixel text-lg"
                                  />
                                  <span className="font-pixel text-lg text-digimon-yellow">-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={getDraft(match).p2}
                                    onChange={(e) => setDraft(match, "p2", e.target.value)}
                                    placeholder="–"
                                    disabled={savingMatchId === match.id}
                                    className="pixel-input w-16 text-center font-pixel text-lg"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-pixel text-lg text-digimon-yellow w-16 text-center">{match.player1Score}</span>
                                  <span className="font-pixel text-lg text-digimon-yellow">-</span>
                                  <span className="font-pixel text-lg text-digimon-yellow w-16 text-center">{match.player2Score}</span>
                                </div>
                              )}
                              <div className="text-left min-w-[150px]">
                                <p className={`font-pixel text-sm ${match.winner?.id === match.player2?.id ? "text-digimon-yellow" : "text-digimon-green"}`}>
                                  {match.player2?.user.name || "BYE"}
                                </p>
                                <p className="font-mono-pixel text-xs text-pixel-gray">{match.player2?.deck?.name || "Sin mazo"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {match.status === "COMPLETED" && (
                              <span className="font-pixel text-xs text-digimon-green">✓ FINALIZADO</span>
                            )}
                            {match.status === "IN_PROGRESS" && (
                              <span className="font-pixel text-xs text-digimon-orange">⏱ EN JUEGO</span>
                            )}
                            {match.status === "PENDING" && (
                              <span className="font-pixel text-xs text-pixel-gray">⏳ PENDIENTE</span>
                            )}
                            {match.status === "BYE" && (
                              <span className="font-pixel text-xs text-digimon-yellow">⭐ BYE</span>
                            )}
                            {canManage && match.player2 && (
                              <button
                                onClick={() => confirmResult(match)}
                                disabled={
                                  savingMatchId !== null ||
                                  getDraft(match).p1 === "" ||
                                  getDraft(match).p2 === ""
                                }
                                className="pixel-button text-xs"
                              >
                                {savingMatchId === match.id ? "GUARDANDO..." : "CONFIRMAR"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* BRACKET/STANDINGS TAB */}
      {activeTab === "bracket" && (
        <div className="space-y-6">
          <h2 className="font-pixel text-lg text-digimon-yellow">CLASIFICACIÓN ACTUAL (SUIZO)</h2>
          <div className="overflow-x-auto">
            <table className="standings-table w-full">
              <thead>
                <tr>
                  <th className="w-12">POS</th>
                  <th>JUGADOR</th>
                  <th className="w-20">PTS</th>
                  <th className="w-16">G</th>
                  <th className="w-16">E</th>
                  <th className="w-16">P</th>
                  <th className="w-24">MAZO</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((p, i) => (
                  <tr key={p.id}>
                    <td className="font-pixel text-digimon-yellow text-center">{i + 1}º</td>
                    <td className="font-mono-pixel text-pixel-white">{p.user.name}</td>
                    <td className="font-pixel text-digimon-green text-center text-lg">{p.points}</td>
                    <td className="font-mono-pixel text-center text-digimon-green">{p.wins}</td>
                    <td className="font-mono-pixel text-center text-digimon-yellow">{p.draws}</td>
                    <td className="font-mono-pixel text-center text-digimon-orange">{p.losses}</td>
                    <td className="font-mono-pixel text-center text-pixel-gray">{p.deck?.name || "Sin mazo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {standings.length > 0 && (
            <div className="pixel-card text-center" style={{ borderColor: "#ffcc00" }}>
              <p className="font-pixel text-2xl text-digimon-yellow">{standings[0].user.name}</p>
              <p className="font-mono-pixel text-pixel-gray mt-1">LÍDER ACTUAL</p>
              <p className="font-pixel text-xl text-digimon-green mt-2">{standings[0].points} PTS</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}