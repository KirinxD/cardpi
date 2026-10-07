import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function TournamentsPage() {
  const session = await auth();
  const admin = isAdmin(session);

  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: { select: { results: true, decks: true } },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-pixel text-3xl text-digimon-orange">TORNEOS</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            {tournaments.length} torneo{tournaments.length !== 1 ? "s" : ""} registrado{tournaments.length !== 1 ? "s" : ""}
          </p>
        </div>
        {admin && (
          <Link href="/tournaments/new" className="pixel-button-secondary">
            + NUEVO TORNEO
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="pixel-card text-center py-16" style={{ borderColor: "#cc5400" }}>
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="font-pixel text-xl text-digimon-orange mb-2">SIN TORNEOS AÚN</h2>
          <p className="font-mono-pixel text-pixel-gray mb-6 max-w-md mx-auto">
            {admin
              ? "Crea el primer torneo para empezar a registrar resultados y mazos ganadores."
              : "Cuando se juegue un torneo aparecerá aquí con sus resultados y mazos."}
          </p>
          {admin && (
            <Link href="/tournaments/new" className="pixel-button-secondary inline-flex">
              CREAR PRIMER TORNEO
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}`}
              className="tournament-row group hover:border-digimon-orange transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-pixel text-lg text-digimon-orange truncate">
                  {tournament.name}
                </h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm font-mono-pixel text-pixel-gray">
                  <span>📅 {format(new Date(tournament.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
                  <span>🏷️ {tournament.season}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div className="text-center">
                  <p className="font-pixel text-2xl text-digimon-yellow">{tournament._count.results}</p>
                  <p className="font-mono-pixel text-xs text-pixel-gray">PARTICIPANTES</p>
                </div>
                <div className="text-center">
                  <p className="font-pixel text-2xl text-digimon-green">{tournament._count.decks}</p>
                  <p className="font-mono-pixel text-xs text-pixel-gray">MAZOS</p>
                </div>
                <span className="font-pixel text-sm text-digimon-orange group-hover:text-digimon-yellow transition-colors">
                  VER →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}