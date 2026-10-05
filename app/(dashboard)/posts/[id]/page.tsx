import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_LABELS = {
  EXPANSION: "📦 EXPANSIÓN",
  PREDICTION: "🔮 PREDICCIÓN",
  GENERAL: "📝 GENERAL",
};

const TYPE_COLORS = {
  EXPANSION: "text-digimon-orange",
  PREDICTION: "text-digimon-yellow",
  GENERAL: "text-digimon-green",
};

// Simple markdown renderer
function renderMarkdown(text: string) {
  return text
    .replace(/^### (.*$)/gim, "<h3 class='font-pixel text-lg text-digimon-green mb-2 mt-4'>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2 class='font-pixel text-xl text-digimon-orange mb-3 mt-6'>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1 class='font-pixel text-2xl text-digimon-yellow mb-4 mt-6'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong class='font-mono-pixel'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em class='font-mono-pixel'>$1</em>")
    .replace(/`(.*?)`/g, "<code class='font-mono-pixel bg-crt-dark px-1.5 py-0.5 rounded border border-crt-border'>$1</code>")
    .replace(/^- (.*$)/gim, "<li class='font-mono-pixel text-pixel-white ml-6 mb-1'>• $1</li>")
    .replace(/\n\n/g, "</p><p class='font-mono-pixel text-pixel-white leading-relaxed mb-4'>")
    .replace(/\n/g, "<br/>");
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, id: true } },
    },
  });

  if (!post) {
    notFound();
  }

  const isAuthor = session?.user?.id === post.authorId;

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/posts"
        className="inline-block mb-4"
      >
        <span className="font-pixel text-xs text-pixel-gray hover:text-digimon-green transition-colors">
          ← VOLVER AL BLOG
        </span>
      </Link>

      <header className="pixel-card" style={{ borderColor: "#008f3a" }}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`font-pixel text-sm ${TYPE_COLORS[post.type]}`}>
            {TYPE_LABELS[post.type]}
          </span>
        </div>
        <h1 className="font-pixel text-2xl md:text-3xl text-digimon-green mb-4">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm font-mono-pixel text-pixel-gray">
          <span>Por <span className="text-digimon-orange">{post.author.name}</span></span>
          <span>•</span>
          <span>{format(new Date(post.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
          {post.updatedAt !== post.createdAt && (
            <>
              <span>•</span>
              <span>Actualizado: {format(new Date(post.updatedAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </>
          )}
        </div>
        {isAuthor && (
          <div className="flex gap-3 mt-4">
            <Link href={`/posts/${post.id}/edit`} className="pixel-button-secondary text-xs">
              EDITAR
            </Link>
            <form
              action={`/api/posts/${post.id}`}
              method="DELETE"
              onSubmit={(e) => {
                if (!confirm("¿Eliminar este post?")) e.preventDefault();
              }}
            >
              <button type="submit" className="pixel-button-secondary text-xs" style={{ borderColor: "#ff0000" }}>
                ELIMINAR
              </button>
            </form>
          </div>
        )}
      </header>

      <div
        className="pixel-card prose"
        style={{ borderColor: "#008f3a" }}
        dangerouslySetInnerHTML={{
          __html: `<p class="font-mono-pixel text-pixel-white leading-relaxed">${renderMarkdown(post.content)}</p>`,
        }}
      />
    </article>
  );
}