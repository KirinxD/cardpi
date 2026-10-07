import { NextResponse } from "next/server";

/**
 * Proxy de la API pública de digimoncard.io (versión actual).
 * Docs: https://digimoncard.io/api-documentation
 *
 * - GET https://digimoncard.io/api-public/search devuelve un ARRAY (no { cards }).
 * - No expone URLs de imagen, así que añadimos card_image_url.
 * - Rate limit del upstream: 15 peticiones / 10 segundos, por lo que cacheamos 1h.
 */

const DIGIMON_API_BASE = "https://digimoncard.io/api-public";
const DIGIMON_IMAGE_BASE = "https://images.digimoncard.io/images/cards";

/** Parámetros que acepta el upstream (nombres oficiales, case-sensitive). */
const ALLOWED_PARAMS = [
  "n",
  "desc",
  "card",
  "color",
  "type",
  "digitype",
  "level",
  "playcost",
  "evocost",
  "pack",
  "setname",
  "series",
  "sort",
  "sortdirection",
] as const;

/** Alias de la API anterior que seguimos aceptando de clientes internos. */
const LEGACY_ALIASES: Record<string, string> = {
  name: "n",
  keyword: "n",
  card_id: "card",
  set_code: "pack",
  cost: "playcost",
};

function cardImageUrl(cardId: string): string {
  return `${DIGIMON_IMAGE_BASE}/${encodeURIComponent(cardId)}.webp`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiParams = new URLSearchParams();

    for (const key of ALLOWED_PARAMS) {
      const value = searchParams.get(key);
      if (value) apiParams.append(key, value);
    }

    for (const [legacyKey, currentKey] of Object.entries(LEGACY_ALIASES)) {
      if (apiParams.has(currentKey)) continue;
      const value = searchParams.get(legacyKey);
      if (value) apiParams.append(currentKey, value);
    }

    const requestedLimit = Number(searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 20;
    apiParams.set("limit", String(limit));

    // El upstream devuelve 400 si no recibe ningún parámetro de búsqueda real.
    const hasSearchQuery = ALLOWED_PARAMS.some(
      (key) => key !== "sort" && key !== "sortdirection" && apiParams.has(key),
    );
    if (!hasSearchQuery) {
      return NextResponse.json({ cards: [] });
    }

    const url = `${DIGIMON_API_BASE}/search?${apiParams.toString()}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "DigimonTCGTracker/1.0" },
      next: { revalidate: 3600 },
    });

    if (response.status === 400) {
      // "No cards found for this search." -> sin resultados, no es un error.
      return NextResponse.json({ cards: [] });
    }

    if (response.status === 429) {
      return NextResponse.json(
        { cards: [], error: "Límite de peticiones de digimoncard.io alcanzado, prueba en unos segundos" },
        { status: 429 },
      );
    }

    if (response.status === 422) {
      const details = await response.text();
      return NextResponse.json(
        { cards: [], error: "Parámetros de búsqueda no válidos", details },
        { status: 400 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { cards: [], error: `Error de digimoncard.io: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const cards: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.cards)
        ? data.cards
        : [];

    const formattedCards = (cards as Record<string, unknown>[]).map((card) => ({
      ...card,
      id: card.id ?? card.card_id,
      card_image_url: typeof card.id === "string" ? cardImageUrl(card.id) : "",
    }));

    return NextResponse.json({ cards: formattedCards });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ cards: [], error: "Error en búsqueda" }, { status: 500 });
  }
}
