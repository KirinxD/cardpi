"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const tournamentSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80),
  date: z.string().min(1, "Selecciona una fecha"),
  season: z.string().min(1, "Temporada requerida"),
});

type TournamentForm = z.infer<typeof tournamentSchema>;

export default function NewTournamentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TournamentForm>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: "",
      date: new Date().toISOString().split("T")[0],
      season: new Date().getFullYear().toString(),
    },
  });

  const onSubmit = async (data: TournamentForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const tournament = await response.json();
        router.push(`/tournaments/${tournament.id}`);
        router.refresh();
      } else {
        alert("Error al crear el torneo");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-pixel text-3xl text-digimon-orange">NUEVO TORNEO</h1>
        <p className="font-mono-pixel text-pixel-gray mt-1">Registra un nuevo torneo mensual</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="pixel-card space-y-6" style={{ borderColor: "#cc5400" }}>
        <div>
          <label className="font-pixel text-xs text-digimon-orange block mb-2">NOMBRE DEL TORNEO</label>
          <input
            {...register("name")}
            className="pixel-input"
            placeholder="Ej: Torneo Mayo 2026 - Local Game Store"
          />
          {errors.name && (
            <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="font-pixel text-xs text-digimon-orange block mb-2">FECHA</label>
          <input
            {...register("date")}
            type="date"
            className="pixel-input"
          />
          {errors.date && (
            <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="font-pixel text-xs text-digimon-orange block mb-2">TEMPORADA</label>
          <input
            {...register("season")}
            className="pixel-input"
            placeholder="Ej: 2026 Season, 2026-2027, etc."
          />
          {errors.season && (
            <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.season.message}</p>
          )}
        </div>

        <button type="submit" className="pixel-button-secondary w-full py-4 text-base" disabled={isSubmitting}>
          {isSubmitting ? "CREANDO..." : "CREAR TORNEO"}
        </button>
      </form>
    </div>
  );
}
