"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { isLevel2Card, type DeckCard } from "@/lib/deck-schema";

/** Ancho del preview en px (la fuente mide 300×420: se muestra por debajo, sin estirar). */
const PREVIEW_WIDTH = 260;
/** Alto estimado del preview (imagen 364 + panel de efectos) para centrarlo en pantalla. */
const PREVIEW_HEIGHT = 520;

type PreviewState = {
  card: DeckCard;
  rect: { top: number; left: number; right: number; height: number };
};

function metaLine(card: DeckCard): string {
  const kind = isLevel2Card(card)
    ? "Digi-Egg"
    : card.level
      ? card.level.replace("Level ", "Lv ")
      : card.type;
  const parts = [kind, card.setCode].filter(Boolean);
  if (card.dp != null) parts.push(`${card.dp} DP`);
  else if (card.cost != null) parts.push(`Coste ${card.cost}`);
  return parts.join(" • ");
}

/**
 * Rejilla de cartas de la ficha de mazo: miniaturas pequeñas para que quepan
 * en pantalla y vista ampliada (imagen + efectos) al pasar el ratón o tocar.
 */
export default function DeckGallery({ cards }: { cards: DeckCard[] }) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [pinned, setPinned] = useState(false);

  // El preview apunta a una miniatura: al hacer scroll dejaría de coincidir.
  useEffect(() => {
    if (!preview) return;
    const hide = () => {
      setPreview(null);
      setPinned(false);
    };
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, [preview]);

  // Vista fijada (toque): se cierra al pulsar fuera de una miniatura.
  useEffect(() => {
    if (!preview || !pinned) return;
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-card-item]")) {
        setPreview(null);
        setPinned(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [preview, pinned]);

  const show = (card: DeckCard, element: HTMLElement) => {
    const { top, left, right, height } = element.getBoundingClientRect();
    setPreview({ card, rect: { top, left, right, height } });
    setPinned(false);
  };

  const togglePin = (card: DeckCard, element: HTMLElement) => {
    if (preview && pinned && preview.card.cardId === card.cardId) {
      setPreview(null);
      setPinned(false);
      return;
    }
    const { top, left, right, height } = element.getBoundingClientRect();
    setPreview({ card, rect: { top, left, right, height } });
    setPinned(true);
  };

  let position: { left: number; top: number } | null = null;
  if (preview && typeof window !== "undefined") {
    const { rect } = preview;
    let left = rect.right + 12;
    if (left + PREVIEW_WIDTH > window.innerWidth - 8) {
      left = rect.left - PREVIEW_WIDTH - 12;
    }
    if (left < 8) left = Math.max(8, (window.innerWidth - PREVIEW_WIDTH) / 2);
    const top = Math.min(
      Math.max(rect.top + rect.height / 2 - PREVIEW_HEIGHT / 2, 8),
      window.innerHeight - PREVIEW_HEIGHT - 8,
    );
    position = { left, top: Math.max(top, 8) };
  }

  return (
    <>
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-3">
        {cards.length === 0 ? (
          <p className="font-mono-pixel text-pixel-gray text-center py-8 col-span-full">
            Sin cartas
          </p>
        ) : (
          cards.map((card) => (
            <div
              key={card.cardId}
              data-card-item="1"
              className="group cursor-pointer"
              onMouseEnter={(event) => show(card, event.currentTarget)}
              onMouseLeave={() => {
                if (!pinned) setPreview(null);
              }}
              onClick={(event) => togglePin(card, event.currentTarget)}
            >
              <div className="relative">
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    width={63}
                    height={88}
                    sizes="(max-width: 640px) 19vw, (max-width: 768px) 13vw, (max-width: 1024px) 11vw, 9vw"
                    className="w-full h-auto rounded border-2 border-crt-border group-hover:border-digimon-green transition-colors"
                  />
                ) : (
                  <div className="w-full aspect-[63/88] bg-crt-dark border-2 border-crt-border flex items-center justify-center text-2xl">
                    🃏
                  </div>
                )}
                <span className="absolute top-0.5 right-0.5 font-pixel text-[10px] bg-crt-dark text-digimon-yellow border-2 border-digimon-yellow px-1">
                  ×{card.quantity}
                </span>
              </div>
              <p
                className="font-pixel text-[9px] text-digimon-green mt-1 truncate"
                title={card.name}
              >
                {card.name}
              </p>
              <p className="font-mono-pixel text-[9px] text-pixel-gray truncate">
                {metaLine(card)}
              </p>
            </div>
          ))
        )}
      </div>

      {preview &&
        position &&
        createPortal(
          <div
            className="fixed z-[60] pointer-events-none"
            style={{ left: position.left, top: position.top, width: PREVIEW_WIDTH }}
            aria-hidden="true"
          >
            <div className="border-4 border-digimon-yellow bg-crt-dark shadow-[0_0_30px_rgba(0,0,0,0.85)]">
              {preview.card.imageUrl && (
                <Image
                  src={preview.card.imageUrl}
                  alt={preview.card.name}
                  width={63}
                  height={88}
                  quality={90}
                  sizes={`${PREVIEW_WIDTH}px`}
                  className="block w-[260px] h-auto"
                />
              )}
              <div className="p-2 space-y-1 border-t-2 border-crt-border">
                <p className="font-pixel text-[10px] text-digimon-green truncate">
                  {preview.card.name} ×{preview.card.quantity}
                </p>
                <p className="font-mono-pixel text-[10px] text-pixel-gray truncate">
                  {metaLine(preview.card)}
                </p>
                {(preview.card.effect || preview.card.sourceEffect) && (
                  <p className="font-mono-pixel text-[11px] text-pixel-white max-h-24 overflow-y-auto whitespace-pre-wrap leading-snug">
                    {preview.card.effect}
                    {preview.card.effect && preview.card.sourceEffect ? "\n" : ""}
                    {preview.card.sourceEffect}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
