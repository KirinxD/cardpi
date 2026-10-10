import { prisma } from "@/lib/prisma";
import { getSwissStandings } from "@/lib/standings";

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
 * Emparejamiento suizo sencillo (jugadores ya ordenados por la tabla):
 *  1. Si el número de jugadores es impar, el peor clasificado sin bye previo
 *     recibe el bye de esta ronda (última mesa).
 *  2. Emparejamiento goloso: cada jugador se lleva al primer rival disponible
 *     con el que no haya jugado todavía. Si solo quedan rivales repetidos, se
 *     acepta la repetición para no dejar a nadie sin mesa.
 */
export function buildPairings(players: PairingPlayer[]): MatchRow[] {
  const queue = [...players];
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
 * Calcula las mesas de la siguiente ronda de un torneo a partir de su
 * clasificación suiza actual (ver lib/standings.ts) y del historial de
 * enfrentamientos, para no repetir rivales.
 *
 * Devuelve `null` si el torneo no tiene participantes activos.
 */
export async function buildRoundMatchRows(
  tournamentId: string,
): Promise<MatchRow[] | null> {
  const [standings, matches] = await Promise.all([
    getSwissStandings(tournamentId),
    prisma.tournamentMatch.findMany({
      where: { tournamentId },
      select: { player1Id: true, player2Id: true },
    }),
  ]);

  const active = standings.filter((r) => !r.dropped);
  if (active.length === 0) return null;

  // Enfrentamientos previos (cualquier combate ya creado cuenta como visto).
  const faced = new Map<string, Set<string>>();
  const facedSet = (id: string) => {
    let set = faced.get(id);
    if (!set) {
      set = new Set();
      faced.set(id, set);
    }
    return set;
  };
  for (const m of matches) {
    if (m.player1Id && m.player2Id) {
      facedSet(m.player1Id).add(m.player2Id);
      facedSet(m.player2Id).add(m.player1Id);
    }
  }

  // `standings` ya viene ordenada por puntos, victorias y seed.
  return buildPairings(
    active.map((r) => ({
      id: r.participantId,
      seed: r.seed,
      points: r.points,
      wins: r.wins,
      hadBye: r.hadBye,
      faced: faced.get(r.participantId) ?? new Set(),
    })),
  );
}

/** Filas Prisma para crear los combates de una ronda ya creada. */
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
