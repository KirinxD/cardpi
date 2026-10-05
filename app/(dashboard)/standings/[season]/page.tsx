import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const POINTS = [10, 7, 5, 3, 1, 1, 1, 1];

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const session = await auth();
  const { season } = await params;

  // Get all tournaments for this season
  const tournaments = await prisma.tournament.findMany({
    where: { season },
    include: {
      results: {
        include: {
          user: { select: { id: true, name: true } },
          deck: { select: { id: true, name: true } },
        },
        orderBy: { placement: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  if (tournaments.length === 0) {
    notFound();
  }

  // Calculate standings
  const playerStats = new Map<
    string,
    { name: string; points: number; tournaments: number; wins: number; top3: number; decks: Set<string> }
  >();

  tournaments.forEach((tournament) => {
    tournament.results.forEach((result) => {
      const placement = result.placement;
      const points = POINTS[placement - 1] || 1;

      const current = playerStats.get(result.userId) || {
        name: result.user.name,
        points: 0,
        tournaments: 0,
        wins: 0,
        top3: 0,
        decks: new Set<string>(),
      };

      current.points += points;
      current.tournaments += 1;
      if (placement === 1) current.wins += 1;
      if (placement <= 3) current.top3 += 1;
      if (result.deck) current.decks.add(result.deck.name);

      playerStats.set(result.userId, current);
    });
  });

  // Convert to array and sort
  const standings = Array.from(playerStats.entries())
    .map(([userId, stats]) => ({ userId, ...stats, decksCount: stats.decks.size }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.top3 !== a.top3) return b.top3 - a.top3;
      return a.name.localeCompare(b.name);
    });

  // Get all seasons for navigation
  const allSeasons = await prisma.tournament.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/standings"
            className="font-pixel text-xs text-pixel-gray hover:text-digimon-yellow transition-colors mb-2 inline-block"
          >
            ← TODAS LAS TEMPORADAS
          </Link>
          <h1 className="font-pixel text-3xl text-digimon-yellow">CLASIFICACIÓN ANUAL</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            Temporada: {season} • {tournaments.length} torneo{tournaments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allSeasons.map((s) => (
            <Link
              key={s.season}
              href={`/standings/${encodeURIComponent(s.season)}`}
              className={`pixel-button-secondary text-xs ${
                s.season === season ? "ring-2 ring-digimon-yellow" : ""
              }`}
            >
              {s.season}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="w-12">POS</th>
              <th>JUGADOR</th>
              <th className="w-20">PTS</th>
              <th className="w-24">TORNEOS</th>
              <th className="w-20">VICTORIAS</th>
              <th className="w-20">TOP 3</th>
              <th className="w-20">MAZOS</th>
              <th className="w-24">PROMEDIO</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((player, index) => (
              <tr key={player.userId}>
                <td className="font-pixel text-digimon-yellow text-center">
                  {index + 1}º
                </td>
                <td className="font-mono-pixel text-pixel-white font-medium">
                  {player.name}
                </td>
                <td className="font-pixel text-digimon-green text-center text-lg">
                  {player.points}
                </td>
                <td className="font-mono-pixel text-center text-pixel-white">
                  {player.tournaments}
                </td>
                <td className="font-pixel text-digimon-orange text-center">
                  {player.wins}
                </td>
                <td className="font-pixel text-digimon-yellow text-center">
                  {player.top3}
                </td>
                <td className="font-mono-pixel text-center text-pixel-white">
                  {player.decksCount}
                </td>
                <td className="font-pixel text-digimon-light-green text-center">
                  {(player.points / player.tournaments).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {standings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="pixel-card text-center" style={{ borderColor: "#ff6b00" }}>
            <p className="font-pixel text-4xl text-digimon-orange">{standings[0].name}</p>
            <p className="font-mono-pixel text-pixel-gray mt-1">CAMPEÓN DE LA TEMPORADA</p>
            <p className="font-pixel text-2xl text-digimon-yellow mt-2">{standings[0].points} PTS</p>
          </div>
          <div className="pixel-card text-center" style={{ borderColor: "#00b84a" }}>
            <p className="font-pixel text-4xl text-digimon-green">{standings[0].wins}</p>
            <p className="font-mono-pixel text-pixel-gray mt-1">VICTORIAS TOTALES</p>
            <p className="font-pixel text-2xl text-digimon-light-green mt-2">{standings[0].wins} / {standings[0].tournaments}</p>
          </div>
          <div className="pixel-card text-center" style={{ borderColor: "#ffcc00" }}>
            <p className="font-pixel text-4xl text-digimon-yellow">{standings.length}</p>
            <p className="font-mono-pixel text-pixel-gray mt-1">JUGADORES ACTIVOS</p>
            <p className="font-pixel text-2xl text-digimon-yellow mt-2">EN LA TEMPORADA</p>
          </div>
        </div>
      )}

      <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <h2 className="font-pixel text-lg text-digimon-green mb-4">TORNEOS DE LA TEMPORADA</h2>
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="tournament-row"
            >
              <div className="flex-1">
                <p className="font-pixel text-sm text-digimon-orange">{t.name}</p>
                <p className="font-mono-pixel text-xs text-pixel-gray">
                  {format(new Date(t.date), "dd MMM yyyy", { locale: es })} • {t.format}
                </p>
              </div>
              <span className="font-pixel text-sm text-digimon-yellow">
                {t.results.length} jugadores
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}