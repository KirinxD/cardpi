import { z } from "zod";

/** Cartas obligatorias en el mazo principal. */
export const MAIN_DECK_SIZE = 50;
/** Máximo de cartas de nivel 2 (Digi-Egg / huevos). */
export const MAX_LEVEL2_CARDS = 5;
/** Máximo de copias de la misma carta. */
export const MAX_COPIES_PER_CARD = 4;

export const deckCardSchema = z.object({
  cardId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(1).max(MAX_COPIES_PER_CARD, "Máximo 4 copias de la misma carta"),
  setCode: z.string().optional(),
  setName: z.string().optional(),
  color: z.string().optional(),
  type: z.string().optional(),
  level: z.string().optional(),
  cost: z.number().optional(),
  dp: z.number().optional(),
  effect: z.string().optional(),
  sourceEffect: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const deckSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60),
  description: z.string().max(500).optional(),
  cards: z.array(deckCardSchema).min(1, "Añade al menos una carta"),
});

export type DeckCard = z.infer<typeof deckCardSchema>;
export type DeckForm = z.infer<typeof deckSchema>;

/** true si la carta es de nivel 2 (Digi-Egg: va al huevo, no al mazo). */
export function isLevel2Card(card: Pick<DeckCard, "level">): boolean {
  const level = Number(String(card.level ?? "").replace(/\D/g, ""));
  return level === 2;
}

export interface DeckComposition {
  /** Cartas que van en el mazo principal (nivel ≠ 2). */
  mainCards: DeckCard[];
  /** Cartas de nivel 2 (Digi-Egg). */
  level2Cards: DeckCard[];
  mainCount: number;
  level2Count: number;
}

/** Orden de visualización: nivel 2 → 7, después Options y al final Tamers. */
export function sortCardsByLevel<
  T extends Pick<DeckCard, "name" | "level" | "type">,
>(cards: T[]): T[] {
  const rank = (card: T): number => {
    const level = Number(String(card.level ?? "").replace(/\D/g, ""));
    if (level > 0) return level;
    const type = (card.type ?? "").trim().toLowerCase();
    if (type === "option") return 90;
    if (type === "tamer") return 91;
    return 80; // sin nivel y que no sea Option/Tamer: tras los niveles
  };

  return [...cards].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "es"),
  );
}

/** Reparte las cartas en mazo principal / nivel 2 y calcula los totales. */
export function getDeckComposition(cards: DeckCard[]): DeckComposition {
  const level2Cards = sortCardsByLevel(cards.filter(isLevel2Card));
  const mainCards = sortCardsByLevel(
    cards.filter((card) => !isLevel2Card(card)),
  );
  const level2Count = level2Cards.reduce((sum, c) => sum + c.quantity, 0);
  const mainCount = mainCards.reduce((sum, c) => sum + c.quantity, 0);
  return { mainCards, level2Cards, mainCount, level2Count };
}

/**
 * Reglas de construcción de mazo: hasta 50 cartas de nivel ≠ 2 y hasta 5 de
 * nivel 2. Se pueden guardar borradores (mazo incompleto), pero nunca un mazo
 * que incumpla los límites. Devuelve un mensaje en español si no cumple.
 */
export function validateDeckComposition(cards: DeckCard[]): {
  valid: boolean;
  error?: string;
} {
  const { mainCount, level2Count } = getDeckComposition(cards);

  if (level2Count > MAX_LEVEL2_CARDS) {
    return {
      valid: false,
      error: `Máximo ${MAX_LEVEL2_CARDS} cartas de nivel 2 (tienes ${level2Count})`,
    };
  }
  if (mainCount > MAIN_DECK_SIZE) {
    return {
      valid: false,
      error: `El mazo principal no puede superar las ${MAIN_DECK_SIZE} cartas (tienes ${mainCount})`,
    };
  }
  return { valid: true };
}

/**
 * Normaliza el JSON guardado en `Deck.cards`: descarta el sideboard (no existe
 * en Digimon), funde duplicados, limita las copias a 4 y descarta basura.
 * Útil para datos antiguos creados con la versión anterior del builder.
 */
export function normalizeDeckCards(raw: unknown): DeckCard[] {
  if (!Array.isArray(raw)) return [];

  const merged = new Map<string, DeckCard>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const card = { ...(item as DeckCard & { isSideboard?: boolean }) };
    delete card.isSideboard;
    if (!card.cardId || typeof card.quantity !== "number") continue;

    const existing = merged.get(card.cardId);
    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + card.quantity,
        MAX_COPIES_PER_CARD,
      );
    } else {
      card.quantity = Math.min(Math.max(card.quantity, 1), MAX_COPIES_PER_CARD);
      merged.set(card.cardId, card);
    }
  }
  return [...merged.values()];
}

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Error de validación";
}
