"use client";

import { useCallback } from "react";
import { useCaught } from "./useCaught";
import { usePc } from "./usePc";
import type { PokemonType, NatureName } from "@/lib/types";

interface AddPokemonParams {
  pokemonId: string;
  pokemonName: string;
  types: PokemonType[];
  dexNumber?: number;
  level?: number;
  ability?: string;
  nature?: NatureName;
}

export function useAddPokemon() {
  const { markCaught } = useCaught();
  const { addToFirstEmpty } = usePc();

  const addToPcAndMarkCaught = useCallback(
    (params: AddPokemonParams): boolean => {
      markCaught(params.pokemonId);
      return addToFirstEmpty({
        pokemonId: params.pokemonId,
        pokemonName: params.pokemonName,
        types: params.types,
        dexNumber: params.dexNumber,
        level: params.level,
        ability: params.ability,
        nature: params.nature,
      });
    },
    [markCaught, addToFirstEmpty]
  );

  return { addToPcAndMarkCaught };
}
