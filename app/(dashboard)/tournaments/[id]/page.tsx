import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const POINTS = [10, 7, 5, 3, 1, 1, 1, 1];

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      results: {
        include: {
          user: { select: { name: true, id: true } },
          deck: { select: { id: true, name: true, cards: true } },
        },
        orderBy: { placement: "asc" },
      },
      decks: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!tournament) {
    notFound();
  }

  const canManage = isAdmin(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/tournaments"
            className="font-pixel text-xs text-pixel-gray hover:text-digimon-orange transition-colors mb-2 inline-block"
          >
            ← VOLVER A TORNEOS
          </Link>
          <h1 className="font-pixel text-3xl text-digimon-orange">{tournament.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm font-mono-pixel text-pixel-gray">
            <span>📅 {format(new Date(tournament.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
            <span>🏷️ {tournament.season}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/tournaments/${tournament.id}/bracket`} className="pixel-button">
            🏆 BRACKET / ELIMINATORIAS
          </Link>
          {canManage && (
            <>
              <Link href={`/tournaments/${tournament.id}/results`} className="pixel-button-secondary">
                GESTIONAR RESULTADOS
              </Link>
              <Link href={`/tournaments/new`} className="pixel-button-secondary">
                NUEVO TORNEO
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="pixel-card" style={{ borderColor: "#cc5400" }}>
          <h2 className="font-pixel text-lg text-digimon-orange mb-4">RESULTADOS / CLASIFICACIÓN</h2>
          {tournament.results.length === 0 ? (
            <p className="font-mono-pixel text-pixel-gray text-center py-8">
              Sin resultados todavía. Se generan automáticamente al finalizar la
              última ronda en el{" "}
              <Link href={`/tournaments/${tournament.id}/bracket`} className="text-digimon-green underline">
                BRACKET
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th className="w-12">POS</th>
                    <th>JUGADOR</th>
                    <th className="w-24">PUNTOS</th>
                    <th className="w-32">MAZO</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.results.map((result) => (
                    <tr key={result.id}>
                      <td className="font-pixel text-digimon-yellow text-center">
                        {result.placement}º
                      </td>
                      <td className="font-mono-pixel text-pixel-white">
                        {result.user.name}
                      </td>
                      <td className="font-pixel text-digimon-green text-center">
                        +{POINTS[result.placement - 1] || 1}
                      </td>
                      <td>
                        {result.deck ? (
                          <Link
                            href={`/decks/${result.deck.id}`}
                            className="font-pixel text-xs text-digimon-green hover:text-digimon-light-green underline truncate block"
                          >
                            {result.deck.name}
                          </Link>
                        ) : (
                          <span className="font-mono-pixel text-xs text-pixel-gray">Sin mazo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="pixel-card" style={{ borderColor: "#008f3a" }}>
          <h2 className="font-pixel text-lg text-digimon-green mb-4">MAZOS JUGADOS</h2>
          {tournament.decks.length === 0 ? (
            <p className="font-mono-pixel text-pixel-gray text-center py-8">
              No hay mazos vinculados a este torneo
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {tournament.decks.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="deck-card flex items-center gap-3 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-sm text-digimon-green truncate">{deck.name}</p>
                    <p className="font-mono-pixel text-xs text-pixel-gray">
                      Pilotado por {deck.user.name}
                    </p>
                  </div>
                  <span className="font-pixel text-xs text-digimon-orange">VER</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <h2 className="font-pixel text-lg text-digimon-green mb-4">SISTEMA DE PUNTOS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {POINTS.map((points, i) => (
            <div key={i} className="pixel-card p-4" style={{ borderColor: "#004411" }}>
              <p className="font-pixel text-2xl text-digimon-yellow">{i + 1}º</p>
              <p className="font-mono-pixel text-pixel-white">{points} pts</p>
            </div>
          ))}
          <div className="pixel-card p-4 md:col-span-4" style={{ borderColor: "#004411" }}>
            <p className="font-pixel text-xl text-digimon-orange">Participación</p>
            <p className="font-mono-pixel text-pixel-white">1 pt (posición 5+)</p>
          </div>
        </div>
      </div>
    </div>
  );
}