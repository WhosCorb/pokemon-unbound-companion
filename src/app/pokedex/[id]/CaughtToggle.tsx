"use client";

import { useCaught } from "@/hooks/useCaught";

interface CaughtToggleProps {
  pokemonId: string;
}

export function CaughtToggle({ pokemonId }: CaughtToggleProps) {
  const { isCaught, markCaught, unmarkCaught } = useCaught();
  const caught = isCaught(pokemonId);

  return (
    <button
      onClick={() => (caught ? unmarkCaught(pokemonId) : markCaught(pokemonId))}
      className={`font-pixel text-[8px] px-3 py-1.5 border rounded-sm transition-colors ${
        caught
          ? "border-gba-green bg-gba-green/10 text-gba-green"
          : "border-gba-border text-gba-text-dim hover:border-gba-green hover:text-gba-green"
      }`}
    >
      {caught ? "CAUGHT" : "MARK CAUGHT"}
    </button>
  );
}
