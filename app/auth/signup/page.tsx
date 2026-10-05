"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (name.length < 2) {
      setFormError("El nombre debe tener al menos 2 caracteres");
      return;
    }

    setIsLoading(true);

    const result = await signIn("credentials", {
      name,
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setFormError(result.error);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="pixel-card text-center mb-8" style={{ borderColor: "#ff6b00" }}>
          <h1 className="font-pixel text-2xl text-digimon-orange mb-2">REGISTRARSE</h1>
          <p className="font-mono-pixel text-pixel-gray">
            Únete al grupo de DigiDestined
          </p>
        </div>

        {formError && (
          <div className="pixel-card mb-6 text-center" style={{ borderColor: "#ff6b00" }}>
            <p className="font-mono-pixel text-digimon-orange">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="pixel-card space-y-6" style={{ borderColor: "#cc5400" }}>
          <div>
            <label htmlFor="name" className="font-pixel text-xs text-digimon-orange block mb-2">
              NOMBRE
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pixel-input"
              placeholder="Tu nombre de DigiDestined"
              required
              autoComplete="name"
              disabled={isLoading}
              maxLength={30}
            />
          </div>

          <div>
            <label htmlFor="email" className="font-pixel text-xs text-digimon-orange block mb-2">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pixel-input"
              placeholder="tu@email.com"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="font-pixel text-xs text-digimon-orange block mb-2">
              CONTRASEÑA
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pixel-input"
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="font-pixel text-xs text-digimon-orange block mb-2">
              CONFIRMAR CONTRASEÑA
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pixel-input"
              placeholder="Repite la contraseña"
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="pixel-button-secondary w-full text-sm"
            disabled={isLoading}
          >
            {isLoading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
          </button>
        </form>

        <p className="font-mono-pixel text-xs text-pixel-gray text-center mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/signin" className="text-digimon-green hover:text-digimon-light-green underline">
            INICIA SESIÓN
          </Link>
        </p>

        <Link href="/" className="block text-center mt-4">
          <span className="font-pixel text-xs text-pixel-gray hover:text-digimon-orange transition-colors">
            ← VOLVER AL INICIO
          </span>
        </Link>
      </div>
    </div>
  );
}