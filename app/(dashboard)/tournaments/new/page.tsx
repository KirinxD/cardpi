import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";
import NewTournamentForm from "@/components/new-tournament-form";

/** Crear torneos es exclusivo de administradores (la API también lo comprueba). */
export default async function NewTournamentPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/tournaments/new");
  }
  if (!isAdmin(session)) {
    redirect("/");
  }

  return <NewTournamentForm />;
}
