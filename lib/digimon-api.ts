const DIGIMON_API_BASE = "https://digimoncard.io/api-public";

export interface DigimonCard {
  card_id: string;
  name: string;
  card_number: string;
  set_name: string;
  set_code: string;
  color: string;
  rarity: string;
  type: string;
  level: string;
  cost: number;
  dp: number;
  effect: string;
  source_effect: string;
  security_effect: string;
  image_url: string;
  card_image_url: string;
  card_back_url: string;
  [key: string]: unknown;
}

export interface SearchParams {
  name?: string;
  color?: string;
  type?: string;
  level?: string;
  cost?: number;
  set_code?: string;
  series?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

function buildSearchUrl(params: SearchParams): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  return `${DIGIMON_API_BASE}/search.php?${searchParams.toString()}`;
}

export async function searchCards(params: SearchParams): Promise<DigimonCard[]> {
  try {
    const url = buildSearchUrl(params);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DigimonTCGTracker/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.cards || [];
  } catch (error) {
    console.error("Error searching cards:", error);
    return [];
  }
}

export async function getCardById(cardId: string): Promise<DigimonCard | null> {
  try {
    const cards = await searchCards({ name: cardId, limit: 1 });
    return cards.find((c) => c.card_id.toLowerCase() === cardId.toLowerCase()) || null;
  } catch (error) {
    console.error("Error fetching card:", error);
    return null;
  }
}

export async function getCardsBySet(setCode: string): Promise<DigimonCard[]> {
  return searchCards({ set_code: setCode, limit: 100 });
}

export async function getAllSets(): Promise<string[]> {
  try {
    const response = await fetch(`${DIGIMON_API_BASE}/set.php`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.sets?.map((s: { set_code: string }) => s.set_code) || [];
  } catch {
    return [];
  }
}

export function formatCardForDeck(card: DigimonCard) {
  return {
    cardId: card.card_id,
    name: card.name,
    setCode: card.set_code,
    setName: card.set_name,
    color: card.color,
    type: card.type,
    level: card.level,
    cost: card.cost,
    dp: card.dp,
    effect: card.effect,
    sourceEffect: card.source_effect,
    imageUrl: card.card_image_url,
  };
}

export const DIGIMON_COLORS = [
  "Red", "Blue", "Yellow", "Green", "Black", "Purple", "White",
] as const;

export const DIGIMON_TYPES = [
  "Digimon", "Tamer", "Option", "Digi-Egg",
] as const;

export const DIGIMON_LEVELS = [
  "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7",
  "Rookie", "Champion", "Ultimate", "Mega", "Armor",
  "In-Training", "Fresh",
] as const;