import type { Pokemon, PokemonType, LearnsetMove, NatureName } from "./types";
import { NATURES } from "./constants";
import { getEffectivenessAgainst } from "./type-calc";

// ──────────────────────────────────────────────
// Nature Recommendation
// ──────────────────────────────────────────────

const PHYSICAL_TYPES: PokemonType[] = ["fighting", "ground", "rock", "bug", "flying", "poison", "normal", "steel", "ghost"];
const SPECIAL_TYPES: PokemonType[] = ["psychic", "fairy", "dragon", "fire", "water", "electric", "grass", "ice", "dark"];
const SPEED_THRESHOLD = 80;

export interface NatureRecommendation {
  name: NatureName;
  increased: string | null;
  decreased: string | null;
}

export function recommendNature(pokemon: Pokemon): NatureRecommendation {
  const { baseStats, types } = pokemon;
  const hasStats = baseStats.hp > 0 || baseStats.attack > 0;

  let isPhysical: boolean;
  let isFast: boolean;

  if (hasStats) {
    isPhysical = baseStats.attack >= baseStats.spAttack;
    isFast = baseStats.speed >= SPEED_THRESHOLD;
  } else {
    // Fallback: type-based heuristic
    isPhysical = types.some((t) => PHYSICAL_TYPES.includes(t));
    isFast = false; // Can't determine without stats
  }

  let natureName: NatureName;
  if (isPhysical && isFast) natureName = "Jolly";
  else if (isPhysical) natureName = "Adamant";
  else if (isFast) natureName = "Timid";
  else natureName = "Modest";

  const nature = NATURES.find((n) => n.name === natureName)!;
  return {
    name: nature.name,
    increased: nature.increased,
    decreased: nature.decreased,
  };
}

// ──────────────────────────────────────────────
// Moveset Recommendation
// ──────────────────────────────────────────────

export interface MoveRecommendation {
  name: string;
  type: PokemonType;
  category: "physical" | "special" | "status";
  power: number | null;
  score: number;
}

/**
 * Score and recommend the best 4 moves for a Pokemon at a given level.
 */
export function recommendMoveset(
  pokemon: Pokemon,
  level: number,
  teamTypes: PokemonType[][],
  completedMilestones: string[]
): MoveRecommendation[] {
  // Determine attacker category from stats
  const isPhysical =
    pokemon.baseStats.attack >= pokemon.baseStats.spAttack ||
    (pokemon.baseStats.attack === 0 && pokemon.baseStats.spAttack === 0);

  // Collect available moves
  const available = pokemon.learnset.filter((m) => {
    if (m.source === "level-up") {
      return m.level != null && m.level <= level;
    }
    if (m.source === "tm" || m.source === "tutor") {
      return true; // Available by default
    }
    return false;
  });

  if (available.length === 0) return [];

  // Compute types already covered by team (excluding this Pokemon)
  const coveredTypes = new Set<PokemonType>();
  for (const memberTypes of teamTypes) {
    for (const t of memberTypes) {
      coveredTypes.add(t);
    }
  }

  // Score each move
  const scored = available.map((m) => {
    let score = 0;

    // Base power contribution
    if (m.power) {
      score += m.power;
    } else if (m.category === "status") {
      score += 30; // Status moves get baseline value
    }

    // STAB bonus
    const isStab = pokemon.types.includes(m.type);
    if (isStab) score += 40;

    // Coverage bonus: reward moves that cover types not handled by team
    if (m.power && m.power > 0) {
      const coverageBonus = computeCoverageBonus(m.type, coveredTypes);
      score += coverageBonus;
    }

    // Category alignment (physical attacker using physical moves, etc.)
    if (m.category !== "status") {
      const moveFitsAttacker =
        (isPhysical && m.category === "physical") ||
        (!isPhysical && m.category === "special");
      if (moveFitsAttacker) score += 20;
    }

    // Accuracy penalty
    if (m.accuracy && m.accuracy < 100) {
      score -= Math.round((100 - m.accuracy) * 0.5);
    }

    return {
      name: m.name,
      type: m.type,
      category: m.category,
      power: m.power,
      score,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select top 4 with diversity: ensure at least 1 STAB move
  const result: MoveRecommendation[] = [];
  const usedTypes = new Set<PokemonType>();
  const usedNames = new Set<string>();

  // First pass: find best STAB move
  const bestStab = scored.find(
    (m) => pokemon.types.includes(m.type) && m.power && m.power > 0
  );
  if (bestStab) {
    result.push(bestStab);
    usedTypes.add(bestStab.type);
    usedNames.add(bestStab.name);
  }

  // Fill remaining slots preferring type diversity
  // First pass: prioritize moves of types not yet represented
  for (const m of scored) {
    if (result.length >= 4) break;
    if (usedNames.has(m.name)) continue;
    if (usedTypes.has(m.type)) continue;

    result.push(m);
    usedTypes.add(m.type);
    usedNames.add(m.name);
  }

  // Second pass: fill remaining slots with best available regardless of type
  for (const m of scored) {
    if (result.length >= 4) break;
    if (usedNames.has(m.name)) continue;

    result.push(m);
    usedTypes.add(m.type);
    usedNames.add(m.name);
  }

  return result;
}

function computeCoverageBonus(
  moveType: PokemonType,
  coveredTypes: Set<PokemonType>
): number {
  if (coveredTypes.has(moveType)) return 0;
  return 25; // Bonus for covering a type the team doesn't have
}

// ──────────────────────────────────────────────
// Move Comparison (for LEARN/SKIP in Upcoming)
// ──────────────────────────────────────────────

/**
 * Score a single move for a given Pokemon (for comparison purposes).
 */
export function scoreMoveForPokemon(
  move: LearnsetMove,
  pokemon: Pokemon,
  teamTypes: PokemonType[][]
): number {
  let score = 0;

  if (move.power) {
    score += move.power;
  } else if (move.category === "status") {
    score += 30;
  }

  const isStab = pokemon.types.includes(move.type);
  if (isStab) score += 40;

  const isPhysical = pokemon.baseStats.attack >= pokemon.baseStats.spAttack;
  if (move.category !== "status") {
    const fits =
      (isPhysical && move.category === "physical") ||
      (!isPhysical && move.category === "special");
    if (fits) score += 20;
  }

  if (move.accuracy && move.accuracy < 100) {
    score -= Math.round((100 - move.accuracy) * 0.5);
  }

  return score;
}

// ──────────────────────────────────────────────
// Gender-Dependent Evolution Detection
// ──────────────────────────────────────────────

const GENDER_EVO_KEYWORDS = ["female", "male"];

/**
 * Check if a Pokemon has gender-dependent evolutions.
 */
export function hasGenderDependentEvolution(pokemon: Pokemon): boolean {
  return pokemon.evolutionChain.some((stage) =>
    GENDER_EVO_KEYWORDS.some((kw) =>
      stage.method.toLowerCase().includes(kw)
    )
  );
}

// ──────────────────────────────────────────────
// Unique Coverage (for replace indicator)
// ──────────────────────────────────────────────

/**
 * For each team member, count how many types ONLY this member covers
 * with super-effective STAB. The member with the least unique coverage
 * is the "weakest link" to suggest replacing.
 */
export function findWeakestLink(
  teamTypes: PokemonType[][],
  allTypes: PokemonType[]
): number {
  if (teamTypes.length === 0) return -1;

  const uniqueCoverageCount = teamTypes.map((memberTypes, idx) => {
    let unique = 0;
    for (const defType of allTypes) {
      // Does this member cover defType with SE STAB?
      const memberCovers = memberTypes.some(
        (atkType) => getEffectivenessAgainst(atkType, [defType]) > 1
      );
      if (!memberCovers) continue;

      // Does any OTHER member also cover it?
      const otherCovers = teamTypes.some(
        (otherTypes, otherIdx) =>
          otherIdx !== idx &&
          otherTypes.some(
            (atkType) => getEffectivenessAgainst(atkType, [defType]) > 1
          )
      );
      if (!otherCovers) unique++;
    }
    return unique;
  });

  // Return index of member with least unique coverage
  let minIdx = 0;
  let minVal = uniqueCoverageCount[0];
  for (let i = 1; i < uniqueCoverageCount.length; i++) {
    if (uniqueCoverageCount[i] < minVal) {
      minVal = uniqueCoverageCount[i];
      minIdx = i;
    }
  }
  return minIdx;
}
