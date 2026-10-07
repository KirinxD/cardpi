"use client";

import { signOut } from "next-auth/react";

/** Botón de cierre de sesión (necesita Client Component para usar signOut). */
export default function SignOutButton({
  className = "pixel-button-secondary text-xs",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
    >
      SALIR
    </button>
  );
}
