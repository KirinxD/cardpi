"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { isAdmin } from "@/lib/roles";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="text-digimon-green font-pixel text-lg animate-pulse">
          CARGANDO...
        </div>
        <div className="mt-4 w-32 h-4 border-4 border-digimon-green relative overflow-hidden">
          <div className="bg-digimon-green h-full w-1/3 animate-ping" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b-4 border-crt-border px-6 py-4 flex items-center justify-between bg-crt-dark/90 backdrop-blur-sm sticky top-0 z-50">
        <Link
          href="/"
          className="font-pixel text-xl text-digimon-green select-none"
        >
          DTP-LOSPI
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                href="/decks"
                className="font-pixel text-xs text-pixel-white hover:text-digimon-green transition-colors"
              >
                MAZOS
              </Link>
              <Link
                href="/tournaments"
                className="font-pixel text-xs text-pixel-white hover:text-digimon-green transition-colors"
              >
                TORNEOS
              </Link>
              <Link
                href="/standings"
                className="font-pixel text-xs text-pixel-white hover:text-digimon-green transition-colors"
              >
                CLASIFICACIÓN
              </Link>
              <Link
                href="/posts"
                className="font-pixel text-xs text-pixel-white hover:text-digimon-green transition-colors"
              >
                BLOG
              </Link>
              {isAdmin(session) && (
                <Link
                  href="/admin"
                  className="pixel-button-secondary text-xs"
                  data-testid="landing-admin-panel"
                >
                  PANEL
                </Link>
              )}
              <span className="font-mono-pixel text-xs text-pixel-gray px-3 py-1 border-2 border-crt-border">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="pixel-button-secondary text-xs"
              >
                SALIR
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/signin" className="pixel-button text-xs">
                ENTRAR
              </Link>
              <Link
                href="/auth/signup"
                className="pixel-button-secondary text-xs"
              >
                REGISTRO
              </Link>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full space-y-8">
          <section className="text-center space-y-6">
            <h1 className="font-pixel text-4xl md:text-6xl text-digimon-green tracking-wider drop-shadow-[4px_4px_0_#004411]">
              DTP-LOSPI
            </h1>
            <p className="font-mono-pixel text-lg text-pixel-white max-w-2xl mx-auto leading-relaxed">
              Rastrea tus torneos, comparte mazos, compite con amigos y domina
              la clasificación anual.
              <br />
              Estilo retro pixelado para verdaderos DigiDestined.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href={session ? "/decks/new" : "/auth/signup"}
              className="pixel-card group hover:border-digimon-green hover:shadow-[0_0_30px_rgba(0,184,74,0.4)] transition-all duration-200"
            >
              <div className="text-6xl mb-4">🃏</div>
              <h3 className="font-pixel text-lg text-digimon-green mb-2">
                CONSTRUCTOR DE MAZOS
              </h3>
              <p className="font-mono-pixel text-pixel-gray text-sm leading-relaxed">
                Crea y comparte tus mazos. Busca cartas de la API oficial.
                Exporta en JSON para compartir.
              </p>
            </Link>

            <Link
              href={session ? "/tournaments/new" : "/auth/signup"}
              className="pixel-card group hover:border-digimon-orange hover:shadow-[0_0_30px_rgba(255,107,0,0.4)] transition-all duration-200"
            >
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="font-pixel text-lg text-digimon-orange mb-2">
                TORNEOS MENSUALES
              </h3>
              <p className="font-mono-pixel text-pixel-gray text-sm leading-relaxed">
                Registra torneos, añade resultados, vincula mazos usados. Top
                automático por evento.
              </p>
            </Link>

            <Link
              href="/standings"
              className="pixel-card group hover:border-digimon-yellow hover:shadow-[0_0_30px_rgba(255,204,0,0.4)] transition-all duration-200"
            >
              <div className="text-6xl mb-4">📊</div>
              <h3 className="font-pixel text-lg text-digimon-yellow mb-2">
                CLASIFICACIÓN ANUAL
              </h3>
              <p className="font-mono-pixel text-pixel-gray text-sm leading-relaxed">
                Puntos por posición: 1º=10, 2º=7, 3º=5, 4º=3, participación=1.
                Tabla por temporada.
              </p>
            </Link>
          </div>

          <section className="pixel-card">
            <h3 className="font-pixel text-xl text-digimon-green mb-6 text-center">
              📝 ZONA LIBRE - BLOG
            </h3>
            <p className="font-mono-pixel text-pixel-white text-center mb-6 leading-relaxed">
              Escribe sobre nuevas expansiones, haz predicciones, comparte
              estrategias o lo que quieras. Markdown completo con estilo
              pixelado.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={session ? "/posts/new" : "/auth/signup"}
                className="pixel-button"
              >
                NUEVO POST
              </Link>
              <Link href="/posts" className="pixel-button-secondary">
                LEER POSTS
              </Link>
            </div>
          </section>

          {!session && (
            <section
              className="pixel-card text-center"
              style={{ borderColor: "#ff6b00" }}
            >
              <h3 className="font-pixel text-xl text-digimon-orange mb-4">
                🔐 ÚNETE AL GRUPO
              </h3>
              <p className="font-mono-pixel text-pixel-white mb-6 leading-relaxed">
                Regístrate para crear mazos, registrar torneos y escribir en el
                blog. Cada amigo tiene su cuenta, todo vinculado a su perfil.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="pixel-button-secondary text-base px-8 py-4"
                >
                  CREAR CUENTA
                </Link>
                <Link
                  href="/auth/signin"
                  className="pixel-button text-base px-8 py-4"
                >
                  YA TENGO CUENTA
                </Link>
              </div>
            </section>
          )}

          <footer className="text-center py-8">
            <p className="font-pixel text-xs text-pixel-gray">
              HECHO CON ❤️ PARA LOS PIBES | NEXT.JS + PRISMA + NEON
            </p>
            <p className="font-mono-pixel text-xs text-pixel-gray mt-2">
              API DE CARTAS: DIGIMONCARD.IO | PWA INSTALABLE EN MÓVIL
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
