import { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import SignOutButton from "@/components/sign-out-button";

const navigation = [
  { href: "/decks", label: "MAZOS", icon: "🃏" },
  { href: "/tournaments", label: "TORNEOS", icon: "🏆" },
  { href: "/standings", label: "CLASIFICACIÓN", icon: "📊" },
  { href: "/posts", label: "BLOG", icon: "📝" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const admin = isAdmin(session);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b-4 border-crt-border px-6 py-4 flex items-center justify-between bg-crt-dark/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="font-pixel text-xl text-digimon-green select-none">
          DTP-LOSPI
        </Link>
        <nav className="flex items-center gap-2">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1 px-4 py-2 font-pixel text-xs text-pixel-white hover:text-digimon-green hover:bg-crt-border/50 transition-all rounded-lg border-2 border-transparent hover:border-crt-border"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-4 py-2 font-pixel text-xs text-digimon-yellow hover:text-digimon-green hover:bg-crt-border/50 transition-all rounded-lg border-2 border-digimon-yellow/40 hover:border-crt-border"
            >
              <span>🛠️</span>
              <span>PANEL</span>
            </Link>
          )}
          <div className="flex items-center gap-3 ml-4 border-l-2 border-crt-border pl-4">
            {session?.user ? (
              <>
                <span className="font-mono-pixel text-xs text-pixel-gray hidden sm:block">
                  {session.user.name}
                </span>
                <SignOutButton />
              </>
            ) : (
              <Link href="/auth/signin" className="pixel-button">
                ENTRAR
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t-2 border-crt-border px-6 py-4 bg-crt-dark/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-pixel text-xs text-pixel-gray">DTP-LOSPI v1.0</p>
          <p className="font-mono-pixel text-xs text-pixel-gray">
            API: DIGIMONCARD.IO | PWA READY
          </p>
        </div>
      </footer>
    </div>
  );
}
