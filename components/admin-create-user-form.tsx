"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Alta de usuarios desde el panel de administración (/admin/users).
 * El botón despliega un formulario; al crear, la tabla se refresca con
 * router.refresh().
 */
export default function AdminCreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok) {
        setSuccess(`Usuario "${body?.name}" creado correctamente`);
        setName("");
        setEmail("");
        setPassword("");
        setRole("USER");
        setOpen(false);
        router.refresh();
      } else {
        setError(body?.error || "Error al crear el usuario");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {success && (
        <p className="font-mono-pixel text-xs text-digimon-green" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="font-mono-pixel text-xs text-digimon-orange" role="alert">
          {error}
        </p>
      )}

      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setSuccess(null);
          }}
          className="pixel-button text-xs"
          data-testid="admin-new-user"
        >
          + NUEVO USUARIO
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="pixel-card space-y-4"
          style={{ borderColor: "#008f3a" }}
          data-testid="admin-new-user-form"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-sm text-digimon-yellow">
              DAR DE ALTA USUARIO
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="font-pixel text-xs text-pixel-gray hover:text-digimon-orange transition-colors"
            >
              ✕ CERRAR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-user-name"
                className="font-pixel text-xs text-digimon-green block mb-2"
              >
                NOMBRE
              </label>
              <input
                id="new-user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pixel-input"
                placeholder="Nombre del jugador"
                required
                minLength={2}
                maxLength={30}
                disabled={busy}
              />
            </div>

            <div>
              <label
                htmlFor="new-user-email"
                className="font-pixel text-xs text-digimon-green block mb-2"
              >
                EMAIL
              </label>
              <input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pixel-input"
                placeholder="tu@email.com"
                required
                disabled={busy}
              />
            </div>

            <div>
              <label
                htmlFor="new-user-password"
                className="font-pixel text-xs text-digimon-green block mb-2"
              >
                CONTRASEÑA
              </label>
              <input
                id="new-user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pixel-input"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>

            <div>
              <label
                htmlFor="new-user-role"
                className="font-pixel text-xs text-digimon-green block mb-2"
              >
                ROL
              </label>
              <select
                id="new-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
                className="pixel-input"
                disabled={busy}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="pixel-button text-xs"
            disabled={busy}
          >
            {busy ? "CREANDO..." : "CREAR USUARIO"}
          </button>
        </form>
      )}
    </div>
  );
}
