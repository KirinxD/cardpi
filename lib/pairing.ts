import { prisma } from "@/lib/prisma";

/** Fila de combate a crear al generar las parejas de una ronda. */
export interface MatchRow {
  player1Id: string;
  player2Id: string | null;
  tableNumber: number;
}

interface PairingPlayer {
  id: string;
  seed: number | null;
  points: number;
  wins: number;
  hadBye: boolean;
  faced: Set<string>;
}

/**
 * Emparejamiento suizo sencillo:
 *  1. Ordena por puntos (desc), victorias (desc) y seed (asc).
 *  2. Si el número de jugadores es impar, el peor clasificado sin bye previo
 *     recibe el bye de esta ronda (última mesa).
 *  3. Emparejamiento goloso: cada jugador se lleva al primer rival disponible
 *     con el que no haya jugado todavía. Si solo quedan rivales repetidos, se
 *     acepta la repetición para no dejar a nadie sin mesa.
 */
export function buildPairings(players: PairingPlayer[]): MatchRow[] {
  const queue = [...players].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER),
  );

  const rows: MatchRow[] = [];

  // Bye para el peor clasificado que aún no haya tenido uno.
  let bye: PairingPlayer | undefined;
  if (queue.length % 2 === 1) {
    bye =
      [...queue].reverse().find((p) => !p.hadBye) ?? queue[queue.length - 1];
    queue.splice(queue.indexOf(bye), 1);
  }

  while (queue.length > 0) {
    const p1 = queue.shift()!;
    if (queue.length === 0) {
      // No debería ocurrir (el nº impar ya se trató), pero por seguridad
      // nadie se queda sin mesa.
      rows.push({ player1Id: p1.id, player2Id: null, tableNumber: rows.length + 1 });
      break;
    }
    let idx = queue.findIndex((o) => !p1.faced.has(o.id));
    if (idx === -1) idx = 0;
    const p2 = queue.splice(idx, 1)[0];
    rows.push({ player1Id: p1.id, player2Id: p2.id, tableNumber: rows.length + 1 });
  }

  if (bye) {
    rows.push({ player1Id: bye.id, player2Id: null, tableNumber: rows.length + 1 });
  }

  return rows;
}

/**
 * Calcula las mesas de la siguiente ronda de un torneo a partir de sus
 * participantes activos y de sus combates previos (clasificación suiza,
 * byes ya repartidos y enfrentamientos anteriores).
 *
 * Devuelve `null` si el torneo no tiene participantes activos.
 */
export async function buildRoundMatchRows(
  tournamentId: string,
): Promise<MatchRow[] | null> {
  const [participants, matches] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { tournamentId, dropped: false },
      select: { id: true, seed: true },
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

  if (participants.length === 0) return null;

  const stats = new Map<string, PairingPlayer>();
  for (const p of participants) {
    stats.set(p.id, {
      id: p.id,
      seed: p.seed,
      points: 0,
      wins: 0,
      hadBye: false,
      faced: new Set(),
    });
  }

  for (const m of matches) {
    const s1 = m.player1Id ? stats.get(m.player1Id) : undefined;
    const s2 = m.player2Id ? stats.get(m.player2Id) : undefined;

    // Cualquier combate previo cuenta como "ya se han enfrentado"
    // (también los aún no jugados, para no repetirlos al emparejar).
    if (s1 && s2) {
      s1.faced.add(s2.id);
      s2.faced.add(s1.id);
    }

    if (m.status === "BYE" && s1) {
      s1.hadBye = true;
      s1.wins += 1;
      s1.points += 3;
    } else if ((m.status === "COMPLETED" || m.status === "DRAW") && s1 && s2) {
      if (m.player1Score > m.player2Score) {
        s1.wins += 1;
        s1.points += 3;
      } else if (m.player2Score > m.player1Score) {
        s2.wins += 1;
        s2.points += 3;
      } else {
        s1.points += 1;
        s2.points += 1;
      }
    }
  }

  return buildPairings([...stats.values()]);
}

/** Crea los combates de una ronda ya creada (filas de `buildPairings`). */
export function matchCreateRows(
  tournamentId: string,
  roundId: string,
  rows: MatchRow[],
) {
  return rows.map((row) => ({
    tournamentId,
    roundId,
    player1Id: row.player1Id,
    player2Id: row.player2Id,
    tableNumber: row.tableNumber,
    // Un bye no se juega: queda finalizado con victoria del jugador asignado.
    status: row.player2Id ? ("PENDING" as const) : ("BYE" as const),
    winnerId: row.player2Id ? null : row.player1Id,
    completedAt: row.player2Id ? null : new Date(),
  }));
}
