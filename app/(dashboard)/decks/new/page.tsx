"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { searchCards, formatCardForDeck, DigimonCard } from "@/lib/digimon-api";

const deckSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60),
  format: z.string().min(1, "Selecciona un formato"),
  description: z.string().max(500).optional(),
  cards: z.array(z.object({
    cardId: z.string(),
    name: z.string(),
    quantity: z.number().min(1).max(4),
    isSideboard: z.boolean(),
    setCode: z.string().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    level: z.string().optional(),
    cost: z.number().optional(),
    dp: z.number().optional(),
    imageUrl: z.string().optional(),
  })).min(1, "Añade al menos una carta"),
});

type DeckForm = z.infer<typeof deckSchema>;

const FORMATS = ["Standard", "Classic", "Unlimited", "Custom"];

export default function NewDeckPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DigimonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DigimonCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<DeckForm>({
    resolver: zodResolver(deckSchema),
    defaultValues: {
      name: "",
      format: "Standard",
      description: "",
      cards: [],
    },
  });

  const cards = watch("cards") || [];
  const mainDeck = cards.filter((c) => !c.isSideboard);
  const sideboard = cards.filter((c) => c.isSideboard);
  const mainCount = mainDeck.reduce((sum, c) => sum + c.quantity, 0);
  const sideCount = sideboard.reduce((sum, c) => sum + c.quantity, 0);

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
    const results = await searchCards({ name: query, limit: 20 });
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSearchDebounce(e.target.value);
  };

  const addCardToDeck = (card: DigimonCard, isSideboard = false) => {
    const formatted = formatCardForDeck(card);
    const existingIndex = cards.findIndex(
      (c) => c.cardId === card.card_id && c.isSideboard === isSideboard
    );

    if (existingIndex >= 0) {
      const newCards = [...cards];
      if (newCards[existingIndex].quantity < 4) {
        newCards[existingIndex].quantity += 1;
        setValue("cards", newCards);
      }
    } else {
      setValue("cards", [...cards, { ...formatted, quantity: 1, isSideboard }]);
    }
    setSelectedCard(null);
    setShowCardModal(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCards = [...cards];
    const newQty = newCards[index].quantity + delta;
    if (newQty >= 1 && newQty <= 4) {
      newCards[index].quantity = newQty;
      setValue("cards", newCards);
    } else if (newQty === 0) {
      newCards.splice(index, 1);
      setValue("cards", newCards);
    }
  };

  const moveToSideboard = (index: number) => {
    const newCards = [...cards];
    newCards[index].isSideboard = !newCards[index].isSideboard;
    setValue("cards", newCards);
  };

  const exportDeck = () => {
    const deckData = {
      name: watch("name"),
      format: watch("format"),
      author: "Usuario",
      date: new Date().toISOString().split("T")[0],
      mainDeck: mainDeck.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        quantity: c.quantity,
      })),
      sideboard: sideboard.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        quantity: c.quantity,
      })),
    };
    const blob = new Blob([JSON.stringify(deckData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${watch("name").replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (data: DeckForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const deck = await response.json();
        router.push(`/decks/${deck.id}`);
        router.refresh();
      } else {
        alert("Error al crear el mazo");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-pixel text-3xl text-digimon-green">NUEVO MAZO</h1>
          <p className="font-mono-pixel text-pixel-gray mt-1">Construye tu mazo para el próximo torneo</p>
        </div>
        <button onClick={exportDeck} className="pixel-button-secondary" disabled={cards.length === 0}>
          EXPORTAR JSON
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="pixel-card space-y-4" style={{ borderColor: "#008f3a" }}>
              <h2 className="font-pixel text-lg text-digimon-green border-b-2 border-crt-border pb-2">
                INFORMACIÓN DEL MAZO
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="font-pixel text-xs text-digimon-green block mb-2">NOMBRE DEL MAZO</label>
                  <input
                    {...register("name")}
                    className="pixel-input"
                    placeholder="Ej: Imperialdramon Control"
                  />
                  {errors.name && (
                    <p className="font-mono-pixel text-xs text-digimon-orange mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="font-pixel text-xs text-digimon-green block mb-2">FORMATO</label>
                  <select {...register("format")} className="pixel-input">
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-pixel text-xs text-digimon-green block mb-2">DESCRIPCIÓN (OPCIONAL)</label>
                  <textarea
                    {...register("description")}
                    className="pixel-input min-h-[100px] resize-y font-mono-pixel"
                    placeholder="Estrategia, tech choices, matchups..."
                  />
                </div>
              </div>
            </div>

            <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-digimon-green">BUSCAR CARTAS</h2>
                <div className="flex items-center gap-2 text-xs font-mono-pixel text-pixel-gray">
                  <span>🔍</span>
                  <span>{isSearching ? "BUSCANDO..." : `${searchResults.length} resultados`}</span>
                </div>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="pixel-input mb-4"
                placeholder="Buscar por nombre... (ej: Imperialdramon, BT1-084)"
                autoComplete="off"
              />
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
                  <p className="font-mono-pixel text-pixel-gray text-center py-8">No se encontraron cartas</p>
                )}
                {searchResults.map((card) => (
                  <button
                    key={card.card_id}
                    type="button"
                    onClick={() => {
                      setSelectedCard(card);
                      setShowCardModal(true);
                    }}
                    className="w-full pixel-card flex items-center gap-4 p-3 text-left group hover:border-digimon-green transition-colors"
                    style={{ borderColor: "#004411" }}
                  >
                    {card.card_image_url && (
                      <img
                        src={card.card_image_url}
                        alt={card.name}
                        className="w-16 h-16 pixelated rounded border-2 border-crt-border flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-pixel text-xs text-digimon-green truncate">{card.name}</p>
                      <p className="font-mono-pixel text-xs text-pixel-gray">
                        {card.set_code} • {card.color} • {card.type} • Cost: {card.cost} • DP: {card.dp}
                      </p>
                    </div>
                    <span className="font-pixel text-xs text-digimon-orange">+</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pixel-card sticky top-24" style={{ borderColor: "#cc5400" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-digimon-orange">MAZO PRINCIPAL</h2>
                <span className="font-pixel text-sm text-digimon-yellow bg-crt-dark px-3 py-1 border-2 border-digimon-yellow">
                  {mainCount}/50
                </span>
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {mainDeck.length === 0 ? (
                  <p className="font-mono-pixel text-pixel-gray text-center py-8 text-sm">
                    Añade cartas desde la búsqueda
                  </p>
                ) : (
                  mainDeck.map((card, idx) => (
                    <div
                      key={`${card.cardId}-${card.isSideboard}`}
                      className="pixel-card flex items-center gap-3 p-3 group"
                      style={{ borderColor: "#004411" }}
                    >
                      {card.imageUrl && (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-12 h-12 pixelated rounded border-2 border-crt-border flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-pixel text-xs text-digimon-green truncate">{card.name}</p>
                        <p className="font-mono-pixel text-xs text-pixel-gray">{card.setCode} • {card.color}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="font-pixel text-lg text-digimon-yellow w-8 text-center">
                          {card.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-8 h-8 pixel-button text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => moveToSideboard(idx)}
                          className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mover a Sideboard"
                        >
                          ↔
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pixel-card" style={{ borderColor: "#008f3a" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg text-digimon-green">SIDEBOARD</h2>
                <span className="font-pixel text-sm text-digimon-yellow bg-crt-dark px-3 py-1 border-2 border-digimon-yellow">
                  {sideCount}/10
                </span>
              </div>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {sideboard.length === 0 ? (
                  <p className="font-mono-pixel text-pixel-gray text-center py-4 text-sm">
                    Cartas de reserva (máx 10)
                  </p>
                ) : (
                  sideboard.map((card, idx) => {
                    const globalIdx = cards.findIndex(
                      (c) => c.cardId === card.cardId && c.isSideboard
                    );
                    return (
                      <div
                        key={`${card.cardId}-side`}
                        className="pixel-card flex items-center gap-3 p-3 group"
                        style={{ borderColor: "#004411" }}
                      >
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-10 h-10 pixelated rounded border-2 border-crt-border flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-pixel text-xs text-digimon-green truncate">{card.name}</p>
                          <p className="font-mono-pixel text-xs text-pixel-gray">{card.setCode}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(globalIdx, -1)}
                            className="w-7 h-7 pixel-button-secondary text-xs flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="font-pixel text-base text-digimon-yellow w-7 text-center">
                            {card.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(globalIdx, 1)}
                            className="w-7 h-7 pixel-button text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => moveToSideboard(globalIdx)}
                            className="w-7 h-7 pixel-button text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mover a Principal"
                          >
                            ↔
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t-2 border-crt-border">
          <button
            type="submit"
            className="pixel-button flex-1 py-4 text-base"
            disabled={isSubmitting || cards.length === 0}
          >
            {isSubmitting ? "GUARDANDO..." : "GUARDAR MAZO"}
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
      </form>

      {showCardModal && selectedCard && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="pixel-card w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ borderColor: "#ff6b00" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-pixel text-lg text-digimon-orange">DETALLE DE CARTA</h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-8 h-8 pixel-button-secondary text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            {selectedCard.card_image_url && (
              <img
                src={selectedCard.card_image_url}
                alt={selectedCard.name}
                className="w-full pixelated rounded border-4 border-crt-border mb-4"
              />
            )}
            <div className="space-y-2 text-sm font-mono-pixel">
              <p><span className="text-digimon-green">Nombre:</span> {selectedCard.name}</p>
              <p><span className="text-digimon-green">Set:</span> {selectedCard.set_name} ({selectedCard.set_code})</p>
              <p><span className="text-digimon-green">Color:</span> {selectedCard.color}</p>
              <p><span className="text-digimon-green">Tipo:</span> {selectedCard.type}</p>
              <p><span className="text-digimon-green">Nivel:</span> {selectedCard.level}</p>
              <p><span className="text-digimon-green">Coste:</span> {selectedCard.cost}</p>
              <p><span className="text-digimon-green">DP:</span> {selectedCard.dp}</p>
              {selectedCard.effect && (
                <p className="mt-2"><span className="text-digimon-green">Efecto:</span> {selectedCard.effect}</p>
              )}
              {selectedCard.source_effect && (
                <p><span className="text-digimon-green">Efecto Origen:</span> {selectedCard.source_effect}</p>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => addCardToDeck(selectedCard, false)}
                className="pixel-button flex-1"
              >
                + PRINCIPAL
              </button>
              <button
                onClick={() => addCardToDeck(selectedCard, true)}
                className="pixel-button-secondary flex-1"
              >
                + SIDEBOARD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}