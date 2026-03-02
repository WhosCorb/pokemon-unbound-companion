import type { PokemonType } from "./types";
import { ALL_TYPES } from "./constants";

// Type effectiveness chart: attackingType -> defendingType -> multiplier
// 2 = super effective, 0.5 = not very effective, 0 = immune
const CHART: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/**
 * Get the effectiveness multiplier for an attacking type against a defending type.
 */
export function getTypeEffectiveness(
  attackType: PokemonType,
  defendType: PokemonType
): number {
  return CHART[attackType]?.[defendType] ?? 1;
}

/**
 * Get the effectiveness multiplier for an attacking type against a dual-typed defender.
 */
export function getEffectivenessAgainst(
  attackType: PokemonType,
  defenderTypes: PokemonType[]
): number {
  return defenderTypes.reduce(
    (mult, defType) => mult * getTypeEffectiveness(attackType, defType),
    1
  );
}

/**
 * Get all type matchups for a defender (single or dual typed).
 * Returns a map of attacking type -> effectiveness multiplier.
 */
export function getDefensiveMatchups(
  defenderTypes: PokemonType[]
): Record<PokemonType, number> {
  const result = {} as Record<PokemonType, number>;
  for (const atkType of ALL_TYPES) {
    result[atkType] = getEffectivenessAgainst(atkType, defenderTypes);
  }
  return result;
}

/**
 * Compute team type coverage: for each attacking type among the team's STAB types,
 * returns the list of defending types that are hit super-effectively.
 */
export function getTeamOffensiveCoverage(
  teamTypes: PokemonType[][]
): Record<PokemonType, number> {
  const coverage = {} as Record<PokemonType, number>;
  for (const defType of ALL_TYPES) {
    let bestMultiplier = 1;
    for (const memberTypes of teamTypes) {
      for (const atkType of memberTypes) {
        const eff = getTypeEffectiveness(atkType, defType);
        if (eff > bestMultiplier) bestMultiplier = eff;
      }
    }
    coverage[defType] = bestMultiplier;
  }
  return coverage;
}

/**
 * Compute team defensive weaknesses: for each attacking type,
 * how many team members are weak (>1x) vs resistant (<1x).
 */
export function getTeamDefensiveSummary(
  teamTypes: PokemonType[][]
): Record<PokemonType, { weak: number; resist: number; immune: number }> {
  const summary = {} as Record<
    PokemonType,
    { weak: number; resist: number; immune: number }
  >;
  for (const atkType of ALL_TYPES) {
    let weak = 0;
    let resist = 0;
    let immune = 0;
    for (const memberTypes of teamTypes) {
      const eff = getEffectivenessAgainst(atkType, memberTypes);
      if (eff > 1) weak++;
      else if (eff === 0) immune++;
      else if (eff < 1) resist++;
    }
    summary[atkType] = { weak, resist, immune };
  }
  return summary;
}
