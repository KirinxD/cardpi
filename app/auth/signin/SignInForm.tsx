"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authErrorMessage } from "@/lib/auth-errors";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");
  const errorCode = searchParams.get("code");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setFormError(authErrorMessage(result.error, result.code));
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="pixel-card text-center mb-8" style={{ borderColor: "#00b84a" }}>
        <h1 className="font-pixel text-2xl text-digimon-green mb-2">INICIAR SESIÓN</h1>
        <p className="font-mono-pixel text-pixel-gray">
          Accede a tu cuenta de DigiDestined
        </p>
      </div>

      {error && (
        <div className="pixel-card mb-6 text-center" style={{ borderColor: "#ff6b00" }}>
          <p className="font-mono-pixel text-digimon-orange">
            {authErrorMessage(error, errorCode)}
          </p>
        </div>
      )}

      {formError && (
        <div className="pixel-card mb-6 text-center" style={{ borderColor: "#ff6b00" }}>
          <p className="font-mono-pixel text-digimon-orange">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pixel-card space-y-6" style={{ borderColor: "#008f3a" }}>
        <div>
          <label htmlFor="email" className="font-pixel text-xs text-digimon-green block mb-2">
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
          <label htmlFor="password" className="font-pixel text-xs text-digimon-green block mb-2">
            CONTRASEÑA
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pixel-input"
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="pixel-button w-full text-sm"
          disabled={isLoading}
        >
          {isLoading ? "ACCEDIENDO..." : "ENTRAR"}
        </button>
      </form>

      <p className="font-mono-pixel text-xs text-pixel-gray text-center mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/signup" className="text-digimon-orange hover:text-digimon-yellow underline">
          REGÍSTRATE
        </Link>
      </p>

      <Link href="/" className="block text-center mt-4">
        <span className="font-pixel text-xs text-pixel-gray hover:text-digimon-green transition-colors">
          ← VOLVER AL INICIO
        </span>
      </Link>
    </div>
  );
}