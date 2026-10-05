"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(5, "Mínimo 5 caracteres").max(100),
  content: z.string().min(10, "Mínimo 10 caracteres"),
  type: z.enum(["EXPANSION", "PREDICTION", "GENERAL"]),
});

type PostForm = z.infer<typeof postSchema>;

const TYPES = [
  { value: "EXPANSION", label: "📦 EXPANSIÓN", desc: "Nuevas cartas, sets, productos" },
  { value: "PREDICTION", label: "🔮 PREDICCIÓN", desc: "Meta, banlist, cartas rotas" },
  { value: "GENERAL", label: "📝 GENERAL", desc: "Estrategias, crónicas, lo que sea" },
];

export default function NewPostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "GENERAL",
    },
  });

  const content = watch("content") || "";

  const onSubmit = async (data: PostForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const post = await response.json();
        router.push(`/posts/${post.id}`);
        router.refresh();
      } else {
        alert("Error al crear el post");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple markdown rendering for preview
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, "<h3 class='font-pixel text-lg text-digimon-green mb-2'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='font-pixel text-xl text-digimon-orange mb-3'>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class='font-pixel text-2xl text-digimon-yellow mb-4'>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-mono-pixel'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em class='font-mono-pixel'>$1</em>")
      .replace(/`(.*?)`/g, "<code class='font-mono-pixel bg-crt-dark px-1 rounded border border-crt-border'>$1</code>")
      .replace(/^- (.*$)/gim, "<li class='font-mono-pixel ml-4'>$1</li>")
      .replace(/\n\n/g, "</p><p class='font-mono-pixel text-pixel-white leading-relaxed'>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-pixel text-3xl text-digimon-green">NUEVO POST</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="pixel-card space-y-4" style={{ borderColor: "#008f3a" }}>
          <h2 className="font-pixel text-lg text-digimon-green border-b-2 border-crt-border pb-2">
            INFORMACIÓN
          </h2>
          <div className="space-y-4">
            <div>
              <label className="font-pixel text-xs text-digimon-green block mb-2">TÍTULO</label>
              <input
                {...register("title")}
                className="pixel-input"
                placeholder="Ej: Análisis de la nueva expansión BT-18"
              />
              {errors.title && (
                <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="font-pixel text-xs text-digimon-green block mb-2">TIPO</label>
              <div className="grid grid-cols-3 gap-3">
                {TYPES.map((t) => (
                  <label
                    key={t.value}
                    className="pixel-card p-3 text-center cursor-pointer transition-colors has-[:checked]:border-digimon-green has-[:checked]:ring-2 has-[:checked]:ring-digimon-green"
                    style={{ borderColor: "#004411" }}
                  >
                    <input
                      type="radio"
                      {...register("type")}
                      value={t.value}
                      className="sr-only"
                    />
                    <p className="font-pixel text-xs text-digimon-green mb-1">{t.label}</p>
                    <p className="font-mono-pixel text-xs text-pixel-gray">{t.desc}</p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pixel-card space-y-4" style={{ borderColor: "#cc5400" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-lg text-digimon-orange">CONTENIDO (MARKDOWN)</h2>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="pixel-button-secondary text-xs"
            >
              {preview ? "EDITAR" : "VISTA PREVIA"}
            </button>
          </div>

          {!preview && (
            <div className="space-y-2">
              <div className="flex gap-2 font-mono-pixel text-xs text-pixel-gray px-2">
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">#</kbd> Título
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">##</kbd> Subtítulo
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">**</kbd> Negrita
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">*</kbd> Cursiva
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">`</kbd> Código
                <kbd className="bg-crt-dark px-1.5 py-0.5 border border-crt-border">-</kbd> Lista
              </div>
              <textarea
                {...register("content")}
                className="pixel-input min-h-[300px] resize-y font-mono-pixel"
                placeholder="Escribe tu post en Markdown..."
              />
              {errors.content && (
                <p className="font-mono-pixel text-xs text-digimon-orange">{errors.content.message}</p>
              )}
            </div>
          )}

          {preview && (
            <div
              className="pixel-card p-6 min-h-[300px] prose"
              style={{ borderColor: "#004411" }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>

        <button type="submit" className="pixel-button w-full py-4 text-base" disabled={isSubmitting}>
          {isSubmitting ? "PUBLICANDO..." : "PUBLICAR POST"}
        </button>
      </form>
    </div>
  );
}