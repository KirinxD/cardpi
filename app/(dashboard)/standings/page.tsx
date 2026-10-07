import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StandingsIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const seasons = await prisma.tournament.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });

  // Get stats for each season
  const seasonsWithStats = await Promise.all(
    seasons.map(async (s) => {
      const tournaments = await prisma.tournament.findMany({
        where: { season: s.season },
        include: {
          results: {
            select: { userId: true, placement: true },
          },
        },
      });

      const totalTournaments = tournaments.length;
      const totalPlayers = new Set(tournaments.flatMap((t) => t.results.map((r) => r.userId))).size;

      return { season: s.season, totalTournaments, totalPlayers };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pixel text-3xl text-digimon-yellow">CLASIFICACIÓN ANUAL</h1>
        <p className="font-mono-pixel text-pixel-gray mt-1">
          Selecciona una temporada para ver la tabla de posiciones
        </p>
      </div>

      {seasonsWithStats.length === 0 ? (
        <div className="pixel-card text-center py-16" style={{ borderColor: "#008f3a" }}>
          <div className="text-6xl mb-4">📊</div>
          <h2 className="font-pixel text-xl text-digimon-yellow mb-2">SIN TEMPORADAS</h2>
          <p className="font-mono-pixel text-pixel-gray mb-6 max-w-md mx-auto">
            Crea torneos y asigna una temporada para que aparezca la clasificación anual.
          </p>
          <Link href="/tournaments/new" className="pixel-button inline-flex">
            CREAR TORNEO
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasonsWithStats.map((season) => (
            <Link
              key={season.season}
              href={`/standings/${encodeURIComponent(season.season)}`}
              className="pixel-card hover:border-digimon-yellow hover:shadow-[0_0_30px_rgba(255,204,0,0.3)] transition-all duration-200"
            >
              <div className="text-center mb-4">
                <span className="font-pixel text-4xl text-digimon-yellow">{season.season}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="pixel-card p-3" style={{ borderColor: "#004411" }}>
                  <p className="font-pixel text-2xl text-digimon-green">{season.totalTournaments}</p>
                  <p className="font-mono-pixel text-xs text-pixel-gray">TORNEOS</p>
                </div>
                <div className="pixel-card p-3" style={{ borderColor: "#004411" }}>
                  <p className="font-pixel text-2xl text-digimon-orange">{season.totalPlayers}</p>
                  <p className="font-mono-pixel text-xs text-pixel-gray">JUGADORES</p>
                </div>
                <div className="pixel-card p-3" style={{ borderColor: "#004411" }}>
                  <p className="font-pixel text-2xl text-digimon-yellow">VER</p>
                  <p className="font-mono-pixel text-xs text-pixel-gray">CLASIFICACIÓN</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <h2 className="font-pixel text-lg text-digimon-green mb-4">SISTEMA DE PUNTUACIÓN</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { pos: "1º", pts: 10, color: "text-digimon-yellow" },
            { pos: "2º", pts: 7, color: "text-digimon-orange" },
            { pos: "3º", pts: 5, color: "text-digimon-light-green" },
            { pos: "4º", pts: 3, color: "text-digimon-green" },
          ].map((p) => (
            <div key={p.pos} className="pixel-card p-4" style={{ borderColor: "#004411" }}>
              <p className={`font-pixel text-2xl ${p.color}`}>{p.pos}</p>
              <p className="font-mono-pixel text-pixel-white">{p.pts} pts</p>
            </div>
          ))}
          <div className="md:col-span-4 pixel-card p-4" style={{ borderColor: "#004411" }}>
            <p className="font-pixel text-xl text-digimon-orange">5º en adelante (Participación)</p>
            <p className="font-mono-pixel text-pixel-white">1 pt</p>
          </div>
        </div>
        <p className="font-mono-pixel text-xs text-pixel-gray mt-4 text-center">
          Desempate: Puntos totales → Victorias → Top 3 → Nombre alfabético
        </p>
      </div>
    </div>
  );
}