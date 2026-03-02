"use client";

import type { PokemonType } from "@/lib/types";
import { TYPE_COLORS, TYPE_ABBREVIATIONS } from "@/lib/constants";

interface TypeBadgeProps {
  type: PokemonType;
  abbreviated?: boolean;
  size?: "sm" | "md";
}

export function TypeBadge({ type, abbreviated = false, size = "sm" }: TypeBadgeProps) {
  const color = TYPE_COLORS[type];
  const label = abbreviated ? TYPE_ABBREVIATIONS[type] : type.toUpperCase();

  return (
    <span
      className="type-badge"
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}88`,
        color: color,
        fontSize: size === "sm" ? "7px" : "8px",
        padding: size === "sm" ? "2px 5px" : "3px 7px",
      }}
    >
      {label}
    </span>
  );
}
