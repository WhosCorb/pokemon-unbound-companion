"use client";

import type { PcPokemon } from "@/lib/types";
import { PokemonSprite } from "@/components/ui/PokemonSprite";

interface PcSlotProps {
  pokemon: PcPokemon | null;
  position: number;
  onTap: () => void;
}

export function PcSlot({ pokemon, position, onTap }: PcSlotProps) {
  if (!pokemon) {
    return (
      <button
        onClick={onTap}
        className="aspect-square w-full rounded-sm border border-dashed border-gba-border/40
                   hover:border-gba-border-light transition-colors flex items-center justify-center"
      >
        <span className="font-pixel text-[6px] text-gba-text-dim/30">
          {position + 1}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onTap}
      className="aspect-square w-full rounded-sm border border-gba-border
                 hover:border-gba-cyan transition-colors flex flex-col items-center justify-center
                 bg-gba-bg/50 gap-0.5 p-0.5 overflow-hidden"
      title={pokemon.nickname || pokemon.pokemonName}
    >
      <PokemonSprite
        dexNumber={pokemon.dexNumber}
        name={pokemon.pokemonName}
        primaryType={pokemon.types[0]}
        size="sm"
      />
      <span className="font-pixel text-[5px] text-gba-text-dim truncate w-full text-center leading-tight">
        {(pokemon.nickname || pokemon.pokemonName).slice(0, 8)}
      </span>
    </button>
  );
}
