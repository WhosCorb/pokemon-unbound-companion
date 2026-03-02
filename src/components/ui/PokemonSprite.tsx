"use client";

import { useState } from "react";
import type { PokemonType } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";

interface PokemonSpriteProps {
  dexNumber?: number;
  name: string;
  primaryType?: PokemonType | string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-20 h-20",
};

const FONT_SIZE_MAP = {
  sm: "text-[6px]",
  md: "text-[8px]",
  lg: "text-[10px]",
  xl: "text-[14px]",
};

export function PokemonSprite({
  dexNumber,
  name,
  primaryType,
  size = "md",
  className = "",
}: PokemonSpriteProps) {
  const [imgError, setImgError] = useState(false);
  const bgColor = primaryType
    ? TYPE_COLORS[primaryType as PokemonType] ?? "#888"
    : "#888";

  const sizeClass = SIZE_MAP[size];
  const fontClass = FONT_SIZE_MAP[size];

  // Show sprite if we have a valid dex number and image hasn't errored
  if (dexNumber && dexNumber > 0 && !imgError) {
    return (
      <div
        className={`${sizeClass} rounded-sm flex-shrink-0 flex items-center justify-center overflow-hidden ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <img
          src={`/sprites/${dexNumber}.png`}
          alt={name}
          loading="lazy"
          className="w-full h-full object-contain"
          style={{ imageRendering: "pixelated" }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: letter in colored square
  return (
    <div
      className={`${sizeClass} rounded-sm flex-shrink-0 flex items-center justify-center font-pixel ${fontClass} text-white ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
