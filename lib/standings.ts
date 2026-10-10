import { prisma } from "@/lib/prisma";

/**
 * Clasificación suiza de un torneo calculada desde sus combates.
 *
 * Es LA referencia para todo el sistema (emparejamiento de rondas, pestaña
 * CLASIFICACIÓN del bracket y clasificación final del torneo):
 *  - Victoria: 3 puntos. Empate: 1 punto. Bye: 3 puntos.
 *  - Orden: puntos (desc), victorias (desc), seed (asc).
 *  - Los jugadores con DROP quedan al final de la tabla.
 */
export interface StandingRow {
  participantId: string;
  userId: string;
  name: string;
  deckId: string | null;
  deckName: string | null;
  seed: number | null;
  dropped: boolean;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  hadBye: boolean;
}

export async function getSwissStandings(
  tournamentId: string,
): Promise<StandingRow[]> {
  const [participants, matches] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        user: { select: { id: true, name: true } },
        deck: { select: { id: true, name: true } },
      },
    }),
    prisma.tournamentMatch.findMany({
      where: { tournamentId },
      select: {
        player1Id: true,
        player2Id: true,
        status: true,
        player1Score: true,
        player2Score: true,
      },
    }),
  ]);

  const rows = new Map<string, StandingRow>();
  for (const p of participants) {
    rows.set(p.id, {
      participantId: p.id,
      userId: p.userId,
      name: p.user.name,
      deckId: p.deckId,
      deckName: p.deck?.name ?? null,
      seed: p.seed,
      dropped: p.dropped,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      hadBye: false,
    });
  }

  for (const m of matches) {
    const r1 = m.player1Id ? rows.get(m.player1Id) : undefined;
    const r2 = m.player2Id ? rows.get(m.player2Id) : undefined;

    if (m.status === "BYE" && r1) {
      r1.hadBye = true;
      r1.wins += 1;
      r1.points += 3;
    } else if ((m.status === "COMPLETED" || m.status === "DRAW") && r1 && r2) {
      if (m.player1Score > m.player2Score) {
        r1.wins += 1;
        r1.points += 3;
        r2.losses += 1;
      } else if (m.player2Score > m.player1Score) {
        r2.wins += 1;
        r2.points += 3;
        r1.losses += 1;
      } else {
        r1.draws += 1;
        r2.draws += 1;
        r1.points += 1;
        r2.points += 1;
      }
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      Number(a.dropped) - Number(b.dropped) ||
      b.points - a.points ||
      b.wins - a.wins ||
      (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Escribe la clasificación final del torneo (TournamentResult) a partir de la
 * tabla suiza actual: 1ª posición = líder, y así sucesivamente. Los jugadores
 * con DROP no reciben resultado. Sustituye los resultados anteriores.
 *
 * Devuelve el número de resultados escritos.
 */
export async function publishFinalClassification(
  tournamentId: string,
): Promise<number> {
  const standings = (await getSwissStandings(tournamentId)).filter(
    (r) => !r.dropped,
  );

  await prisma.$transaction([
    prisma.tournamentResult.deleteMany({ where: { tournamentId } }),
    prisma.tournamentResult.createMany({
      data: standings.map((row, i) => ({
        tournamentId,
        userId: row.userId,
        placement: i + 1,
        deckId: row.deckId,
      })),
    }),
  ]);

  return standings.length;
}
