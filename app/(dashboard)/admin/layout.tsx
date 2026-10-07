import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

/** Guardia del panel: solo administradores (el proxy ya bloquea a anónimos). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }
  if (!isAdmin(session)) {
    redirect("/");
  }

  return <>{children}</>;
}
