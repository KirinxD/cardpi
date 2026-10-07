"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchCards, formatCardForDeck, type DigimonCard } from "@/lib/digimon-api";
import {
  deckSchema,
  getDeckComposition,
  isLevel2Card,
  MAIN_DECK_SIZE,
  MAX_COPIES_PER_CARD,
  MAX_LEVEL2_CARDS,
  type DeckCard,
  type DeckForm,
} from "@/lib/deck-schema";

export interface DeckBuilderDeck {
  id: string;
  name: string;
  description: string;
  cards: DeckCard[];
}

/**
 * Constructor de mazos compartido por:
 *  - /decks/new       (sin prop `deck`)
 *  - /decks/[id]/edit (con prop `deck`)
 *
 * Reglas del TCG de Digimon:
 *  - El mazo principal tiene exactamente 50 cartas de nivel ≠ 2.
 *  - Los Digi-Egg (nivel 2) van aparte: hasta 5.
 *  - No existe sideboard ni formato.
 */
export default function DeckBuilder({
  deck,
  users,
}: {
  deck?: DeckBuilderDeck;
  /** Solo admin: usuarios entre los que elegir el dueño de un mazo nuevo. */
  users?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Usuario destino al crear ("" = yo mismo). Solo el admin ve el selector.
  const [targetUserId, setTargetUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DigimonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DigimonCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState("");
  const [flash, setFlash] = useState<{
    message: string;
    tone: "ok" | "warn";
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DeckForm>({
    resolver: zodResolver(deckSchema),
    defaultValues: {
      name: deck?.name ?? "",
      description: deck?.description ?? "",
      cards: deck?.cards ?? [],
    },
  });

  const cards = watch("cards") || [];
  const { mainCards, level2Cards, mainCount, level2Count } =
    getDeckComposition(cards);
  const level2Ok = level2Count <= MAX_LEVEL2_CARDS;
  // Borradores permitidos: se puede guardar con menos de 50 cartas y
  // completar el mazo después; nunca se puede superar el máximo.
  const mainOk = mainCount <= MAIN_DECK_SIZE;
  const mainComplete = mainCount === MAIN_DECK_SIZE;
  const canSave =
    level2Ok && mainOk && cards.length > 0 && !isSubmitting;

  // Aviso efímero al añadir cartas ("+1 Agumon → 2/4", límites...).
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(timer);
  }, [flash]);

  // Búsqueda con debounce (300 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDebounce.trim().length >= 2) {
        performSearch(searchDebounce);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    const results = await searchCards({ n: query });
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSearchDebounce(e.target.value);
  };

  const addCardToDeck = (card: DigimonCard) => {
    const formatted = formatCardForDeck(card);
    const isEgg = isLevel2Card(formatted);
    const group = isEgg ? level2Cards : mainCards;
    const existing = group.find((c) => c.cardId === formatted.cardId);

    if (existing && existing.quantity >= MAX_COPIES_PER_CARD) {
      setFlash({
        message: `Máximo ${MAX_COPIES_PER_CARD} copias de ${existing.name}`,
        tone: "warn",
      });
      return;
    }
    if (isEgg && level2Count >= MAX_LEVEL2_CARDS) {
      setFlash({
        message: `Máximo ${MAX_LEVEL2_CARDS} cartas de nivel 2 (Digi-Egg)`,
        tone: "warn",
      });
      return;
    }
    if (!isEgg && mainCount >= MAIN_DECK_SIZE) {
      setFlash({
        message: `El mazo principal ya tiene ${MAIN_DECK_SIZE} cartas`,
        tone: "warn",
      });
      return;
    }

    if (existing) {
      setValue(
        "cards",
        cards.map((c) =>
          c.cardId === existing.cardId
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        ),
        { shouldDirty: true },
      );
      setFlash({
        message: `${existing.name} → ${existing.quantity + 1}/${MAX_COPIES_PER_CARD} (${
          isEgg ? "nivel 2" : "principal"
        })`,
        tone: "ok",
      });
    } else {
      setValue("cards", [...cards, { ...formatted, quantity: 1 }], {
        shouldDirty: true,
      });
      setFlash({
        message: `${formatted.name} añadida al ${
          isEgg ? "nivel 2 (Digi-Egg)" : "mazo principal"
        }`,
        tone: "ok",
      });
    }

    // Cerramos el detalle si estaba abierto, pero la lista de resultados se
    // queda para seguir añadiendo cartas sin volver a buscar.
    setSelectedCard(null);
    setShowCardModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const current = cards[index];
    if (!current) return;

    const newQty = current.quantity + delta;
    const newCards = [...cards];

    if (newQty === 0) {
      newCards.splice(index, 1);
    } else if (newQty <= MAX_COPIES_PER_CARD) {
      newCards[index] = { ...current, quantity: newQty };
    } else {
      setFlash({
        message: `Máximo ${MAX_COPIES_PER_CARD} copias de ${current.name}`,
        tone: "warn",
      });
      return;
    }

    setValue("cards", newCards, { shouldDirty: true });
  };

  const exportDeck = () => {
    const deckData = {
      name: watch("name"),
      author: "Usuario",
      date: new Date().toISOString().split("T")[0],
      mainDeck: mainCards.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        quantity: c.quantity,
      })),
      level2: level2Cards.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        quantity: c.quantity,
      })),
    };
    const blob = new Blob([JSON.stringify(deckData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${watch("name").replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (data: DeckForm) => {
    if (!level2Ok || !mainOk) return;
    setIsSubmitting(true);
    try {
      const payload = !deck && targetUserId ? { ...data, targetUserId } : data;
      const response = await fetch(
        deck ? `/api/decks/${deck.id}` : "/api/decks",
        {
          method: deck ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (response.ok) {
        const saved = await response.json();
        router.push(`/decks/${saved.id}`);
        router.refresh();
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Error al guardar el mazo");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCardRow = (card: DeckCard, compact = false) => {
    const globalIdx = cards.findIndex((c) => c.cardId === card.cardId);
    return (
      <div
        key={card.cardId}
        className="pixel-card flex items-center gap-3 p-3 group"
        style={{ borderColor: "#004411" }}
      >
        {card.imageUrl && (
          <Image
            src={card.imageUrl}
            alt={card.name}
            width={63}
            height={88}
            sizes={compact ? "40px" : "48px"}
            className={`${
              compact ? "w-10" : "w-12"
            } h-auto rounded border-2 border-crt-border flex-shrink-0`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-pixel text-xs text-digimon-green truncate">
            {card.name}
          </p>
          <p className="font-mono-pixel text-xs text-pixel-gray">
            {card.setCode}
            {card.color ? ` • ${card.color}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateQuantity(globalIdx, -1)}
            className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center"
            aria-label={`Quitar una copia de ${card.name}`}
          >
            −
          </button>
          <span
            className={`font-pixel text-lg w-8 text-center ${
              card.quantity >= MAX_COPIES_PER_CARD
                ? "text-digimon-orange"
                : "text-digimon-yellow"
            }`}
          >
            {card.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(globalIdx, 1)}
            className="w-8 h-8 pixel-button text-xs flex items-center justify-center"
            aria-label={`Añadir una copia de ${card.name}`}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => updateQuantity(globalIdx, -card.quantity)}
            className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar del mazo"
            aria-label={`Eliminar ${card.name} del mazo`}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pixel text-3xl text-digimon-green">
          {deck ? "EDITAR MAZO" : "NUEVO MAZO"}
        </h1>
        <p className="font-mono-pixel text-pixel-gray mt-1">
          {deck
            ? "Busca cartas para añadirlas o ajusta las cantidades"
            : "50 cartas de mazo + hasta 5 de nivel 2 (Digi-Egg)"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              className="pixel-card space-y-4"
              style={{ borderColor: "#008f3a" }}
            >
              <h2 className="font-pixel text-lg text-digimon-green border-b-2 border-crt-border pb-2">
                INFORMACIÓN DEL MAZO
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="font-pixel text-xs text-digimon-green block mb-2">
                    NOMBRE DEL MAZO
                  </label>
                  <input
                    {...register("name")}
                    className="pixel-input"
                    placeholder="Ej: Imperialdramon Control"
                  />
                  {errors.name && (
                    <p className="font-mono-pixel text-xs text-digimon-orange mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-pixel text-xs text-digimon-green block mb-2">
                    DESCRIPCIÓN (OPCIONAL)
                  </label>
                  <textarea
                    {...register("description")}
                    className="pixel-input min-h-[100px] resize-y font-mono-pixel"
                    placeholder="Estrategia, tech choices, matchups..."
                  />
                </div>
                {!deck && users && (
                  <div>
                    <label className="font-pixel text-xs text-digimon-green block mb-2">
                      USUARIO DESTINO (ADMIN)
                    </label>
                    <select
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="pixel-input"
                    >
                      <option value="">Yo mismo</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-digimon-green">
                  BUSCAR CARTAS
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono-pixel text-pixel-gray">
                  <span>🔍</span>
                  <span>
                    {isSearching
                      ? "BUSCANDO..."
                      : `${searchResults.length} resultados`}
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="pixel-input mb-2"
                placeholder="Buscar por nombre o nº (ej: Imperialdramon, BT1-084)"
                autoComplete="off"
              />
              <p className="font-mono-pixel text-xs text-pixel-gray mb-2">
                Pulsa <span className="text-digimon-green">+</span> para añadir al
                mazo · toca la carta para ver sus detalles. Las de nivel 2 van a
                los Digi-Egg (máx. {MAX_LEVEL2_CARDS}).
              </p>
              {flash && (
                <p
                  role="status"
                  className={`font-mono-pixel text-xs mb-2 ${
                    flash.tone === "ok"
                      ? "text-digimon-green"
                      : "text-digimon-orange"
                  }`}
                >
                  {flash.tone === "ok" ? "✓ " : "⚠ "}
                  {flash.message}
                </p>
              )}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.length === 0 &&
                  !isSearching &&
                  searchQuery.length >= 2 && (
                    <p className="font-mono-pixel text-pixel-gray text-center py-8">
                      No se encontraron cartas
                    </p>
                  )}
                {searchResults.map((card) => (
                  <div
                    key={card.id}
                    className="w-full pixel-card flex items-center gap-3 p-3 group hover:border-digimon-green transition-colors"
                    style={{ borderColor: "#004411" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCard(card);
                        setShowCardModal(true);
                      }}
                      className="flex items-center gap-4 flex-1 min-w-0 text-left"
                      title="Ver detalles de la carta"
                    >
                      {card.card_image_url && (
                        <Image
                          src={card.card_image_url}
                          alt={card.name}
                          width={63}
                          height={88}
                          sizes="64px"
                          className="w-16 h-auto rounded border-2 border-crt-border flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-pixel text-xs text-digimon-green truncate">
                          {card.name}
                        </p>
                        <p className="font-mono-pixel text-xs text-pixel-gray">
                          {card.id} • {card.color} • {card.type} • Cost:{" "}
                          {card.play_cost} • DP: {card.dp}
                          {card.level != null && ` • Lv ${card.level}`}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => addCardToDeck(card)}
                      className="w-9 h-9 pixel-button text-sm flex items-center justify-center flex-shrink-0"
                      title="Añadir al mazo"
                      aria-label={`Añadir ${card.name} al mazo`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-sm text-digimon-green">
                  NIVEL 2 (DIGI-EGG)
                </h2>
                <span
                  className={`font-pixel text-sm bg-crt-dark px-3 py-1 border-2 ${
                    level2Ok
                      ? "text-digimon-yellow border-digimon-yellow"
                      : "text-digimon-orange border-digimon-orange"
                  }`}
                >
                  {level2Count}/{MAX_LEVEL2_CARDS}
                </span>
              </div>
              <div className="max-h-[220px] overflow-y-auto space-y-2">
                {level2Cards.length === 0 ? (
                  <p className="font-mono-pixel text-pixel-gray text-center py-4 text-sm">
                    Huevos (nivel 2), máx. {MAX_LEVEL2_CARDS}
                  </p>
                ) : (
                  level2Cards.map((card) => renderCardRow(card, true))
                )}
              </div>
            </div>

            <div
              className="pixel-card sticky top-24"
              style={{ borderColor: "#cc5400" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-digimon-orange">
                  MAZO PRINCIPAL
                </h2>
                <span
                  className={`font-pixel text-sm bg-crt-dark px-3 py-1 border-2 ${
                    mainComplete
                      ? "text-digimon-yellow border-digimon-yellow"
                      : "text-digimon-orange border-digimon-orange"
                  }`}
                >
                  {mainCount}/{MAIN_DECK_SIZE}
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {mainCards.length === 0 ? (
                  <p className="font-mono-pixel text-pixel-gray text-center py-8 text-sm">
                    Añade cartas desde la búsqueda
                  </p>
                ) : (
                  mainCards.map((card) => renderCardRow(card))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t-2 border-crt-border">
          {!level2Ok && (
            <p className="font-mono-pixel text-xs text-digimon-orange">
              ⚠ Nivel 2: máximo {MAX_LEVEL2_CARDS} cartas (tienes {level2Count})
            </p>
          )}
          {!mainOk && (
            <p className="font-mono-pixel text-xs text-digimon-orange">
              ⚠ El mazo principal no puede superar las {MAIN_DECK_SIZE} cartas
              (tienes {mainCount}/{MAIN_DECK_SIZE})
            </p>
          )}
          {mainOk && !mainComplete && (
            <p className="font-mono-pixel text-xs text-digimon-yellow">
              ⚠ Borrador: faltan {MAIN_DECK_SIZE - mainCount} cartas (
              {mainCount}/{MAIN_DECK_SIZE}) — puedes guardar y completar el mazo
              después
            </p>
          )}
          {level2Ok && mainComplete && (
            <p className="font-mono-pixel text-xs text-digimon-green">
              ✓ Mazo completo: {mainCount} cartas + {level2Count} de nivel 2
            </p>
          )}
          {errors.cards && (
            <p className="font-mono-pixel text-xs text-digimon-orange">
              {Array.isArray(errors.cards)
                ? "Revisa las cantidades de las cartas (máximo 4 copias)"
                : errors.cards.message}
            </p>
          )}
          <div className="flex gap-4">
            <button
              type="submit"
              className="pixel-button flex-1 py-4 text-base"
              disabled={!canSave}
            >
              {isSubmitting
                ? "GUARDANDO..."
                : deck
                  ? "GUARDAR CAMBIOS"
                  : "GUARDAR MAZO"}
            </button>
            <button
              type="button"
              onClick={exportDeck}
              className="pixel-button-secondary flex-1 py-4 text-base"
              disabled={cards.length === 0}
            >
              EXPORTAR JSON
            </button>
          </div>
        </div>
      </form>

      {showCardModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div
            className="pixel-card w-full max-w-sm max-h-[80vh] overflow-y-auto"
            style={{ borderColor: "#ff6b00" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-pixel text-lg text-digimon-orange">
                DETALLE DE CARTA
              </h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            {selectedCard.card_image_url && (
              <Image
                src={selectedCard.card_image_url}
                alt={selectedCard.name}
                width={630}
                height={880}
                sizes="(max-width: 768px) 100vw, 384px"
                priority
                quality={90}
                className="w-full h-auto rounded border-4 border-crt-border mb-4"
              />
            )}
            <div className="space-y-2 text-sm font-mono-pixel">
              <p>
                <span className="text-digimon-green">Nombre:</span>{" "}
                {selectedCard.name}
              </p>
              <p>
                <span className="text-digimon-green">Set:</span>{" "}
                {(selectedCard.set_name ?? []).join(" • ")} ({selectedCard.id})
              </p>
              <p>
                <span className="text-digimon-green">Color:</span>{" "}
                {selectedCard.color}
              </p>
              <p>
                <span className="text-digimon-green">Tipo:</span>{" "}
                {selectedCard.type}
              </p>
              <p>
                <span className="text-digimon-green">Nivel:</span>{" "}
                {selectedCard.level ?? "—"}
              </p>
              <p>
                <span className="text-digimon-green">Coste:</span>{" "}
                {selectedCard.play_cost ?? "—"}
              </p>
              <p>
                <span className="text-digimon-green">DP:</span>{" "}
                {selectedCard.dp ?? "—"}
              </p>
              {selectedCard.main_effect && (
                <p className="mt-2">
                  <span className="text-digimon-green">Efecto:</span>{" "}
                  {selectedCard.main_effect}
                </p>
              )}
              {selectedCard.source_effect && (
                <p>
                  <span className="text-digimon-green">Efecto Origen:</span>{" "}
                  {selectedCard.source_effect}
                </p>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={() => addCardToDeck(selectedCard)}
                className="pixel-button w-full"
              >
                + {selectedCard.level === 2 ? "AÑADIR A NIVEL 2" : "AÑADIR AL MAZO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
