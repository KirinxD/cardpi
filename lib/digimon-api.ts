/**
 * Cliente de la API pública de digimoncard.io (versión actual).
 *
 * Docs: https://digimoncard.io/api-documentation
 * - Endpoint de búsqueda: GET https://digimoncard.io/api-public/search
 * - Devuelve un ARRAY con los campos en snake_case (id, play_cost, main_effect...).
 * - Rate limit: 15 peticiones / 10 segundos.
 * - La API no devuelve URLs de imagen: se construyen aquí con cardImageUrl().
 */

const DIGIMON_IMAGE_BASE = "https://images.digimoncard.io/images/cards";

/** Tarjeta tal y como la devuelve /search (más card_image_url, añadida por nuestro proxy). */
export interface DigimonCard {
  id: string;
  name: string;
  type: string;
  level: number | null;
  play_cost: number | null;
  evolution_cost: number | null;
  evolution_color: string | null;
  evolution_level: number | null;
  xros_req: string;
  color: string;
  color2: string | null;
  digi_type: string | null;
  digi_type2: string | null;
  digi_type3: string | null;
  digi_type4: string | null;
  digi_type5: string | null;
  form: string | null;
  dp: number | null;
  attribute: string | null;
  rarity: string;
  stage: string | null;
  artist: string | null;
  main_effect: string;
  source_effect: string;
  alt_effect: string;
  series: string;
  pretty_url: string;
  date_added: string;
  set_name: string[];
  /** Añadida por /api/cards/search: la API pública no expone imágenes. */
  card_image_url: string;
  [key: string]: unknown;
}

/** Parámetros oficiales de GET /api-public/search. */
export interface SearchParams {
  /** Nombre de carta (admite `e:termino` para excluir). */
  n?: string;
  /** Efecto (descripción) de la carta. */
  desc?: string;
  /** Número de carta, acepta varios separados por comas (ej: "BT4-016,BT1-010"). */
  card?: string;
  color?: string;
  type?: string;
  digitype?: string;
  level?: number;
  playcost?: number;
  evocost?: number;
  /** Nombre del pack (ej: "BT-04: Booster Great Legend" o "BT-04"). */
  pack?: string;
  series?: string;
  sort?: "name" | "power" | "code" | "color" | "level" | "playcost" | "type" | "new";
  sortdirection?: "asc" | "desc";
  /** Máximo 1000. */
  limit?: number;
}

/**
 * URL de la imagen de una carta.
 * Patrón verificado: https://images.digimoncard.io/images/cards/{id}.webp
 */
export function cardImageUrl(cardId: string): string {
  return `${DIGIMON_IMAGE_BASE}/${encodeURIComponent(cardId)}.webp`;
}

function buildQuery(params: SearchParams): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.append(key, String(value));
  }

  query.set("limit", String(Math.min(Math.max(Number(query.get("limit")) || 20, 1), 1000)));
  return query;
}

/**
 * Busca cartas contra /api/cards/search (nuestro proxy, que cachea la respuesta
 * y normaliza los resultados añadiendo card_image_url).
 */
export async function searchCards(params: SearchParams): Promise<DigimonCard[]> {
  try {
    const query = buildQuery(params);
    const response = await fetch(`/api/cards/search?${query.toString()}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.cards || [];
  } catch (error) {
    console.error("Error searching cards:", error);
    return [];
  }
}

/** Busca por número de carta exacto (ej: "BT4-016"). */
export async function getCardById(cardId: string): Promise<DigimonCard | null> {
  try {
    const cards = await searchCards({ card: cardId, limit: 5 });
    const wanted = cardId.trim().toLowerCase();
    return cards.find((c) => c.id.toLowerCase() === wanted) || cards[0] || null;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
}

/** Formatea una tarjeta al modelo que guardamos en la base de datos (model Card). */
export function formatCardForDeck(card: DigimonCard) {
  const [firstSet] = card.set_name ?? [];

  return {
    cardId: card.id,
    name: card.name,
    // "BT4-016" -> "BT4"
    setCode: card.id.includes("-") ? card.id.slice(0, card.id.indexOf("-")) : card.id,
    setName: firstSet,
    color: card.color,
    type: card.type,
    level: card.level != null ? `Level ${card.level}` : undefined,
    cost: card.play_cost ?? undefined,
    dp: card.dp ?? undefined,
    effect: card.main_effect,
    sourceEffect: card.source_effect,
    imageUrl: card.card_image_url || cardImageUrl(card.id),
  };
}
