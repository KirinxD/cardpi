import { prisma } from "@/lib/prisma";
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

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    include: {
      author: { select: { name: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-pixel text-3xl text-digimon-green">BLOG / ZONA LIBRE</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""} publicado{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/posts/new" className="pixel-button">
          + NUEVO POST
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="pixel-card text-center py-16" style={{ borderColor: "#008f3a" }}>
          <div className="text-6xl mb-4">📝</div>
          <h2 className="font-pixel text-xl text-digimon-green mb-2">SIN POSTS AÚN</h2>
          <p className="font-mono-pixel text-pixel-gray mb-6 max-w-md mx-auto">
            Escribe sobre nuevas expansiones, haz predicciones, comparte estrategias o lo que quieras.
          </p>
          <Link href="/posts/new" className="pixel-button inline-flex">
            ESCRIBIR PRIMER POST
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="pixel-card group hover:border-digimon-green transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`font-pixel text-xs ${TYPE_COLORS[post.type]}`}>
                      {TYPE_LABELS[post.type]}
                    </span>
                    <span className="font-mono-pixel text-xs text-pixel-gray">
                      Por {post.author.name}
                    </span>
                    <span className="font-mono-pixel text-xs text-pixel-gray">
                      • {format(new Date(post.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  <h3 className="font-pixel text-lg text-digimon-green truncate group-hover:text-digimon-light-green transition-colors">
                    {post.title}
                  </h3>
                  <p className="font-mono-pixel text-sm text-pixel-gray mt-2 line-clamp-2">
                    {post.content.replace(/[#*`_\[\]()]/g, "").slice(0, 200)}...
                  </p>
                </div>
                <span className="font-pixel text-xs text-digimon-green group-hover:text-digimon-light-green transition-colors whitespace-nowrap">
                  LEER MÁS →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}