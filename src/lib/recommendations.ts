import type { Pokemon, PokemonType, LearnsetMove, NatureName, Trainer, TrainerPokemon, TeamSlot, Difficulty } from "./types";
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
  completedMilestones: string[],
  options?: { levelUpOnly?: boolean }
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
    if (options?.levelUpOnly) return false;
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

// ──────────────────────────────────────────────
// Battle Strategy
// ──────────────────────────────────────────────

export interface BattleAssignment {
  opponentPokemon: TrainerPokemon;
  counterSlot: TeamSlot;
  recommendedMove: string;
  moveType: PokemonType;
  offenseMultiplier: number;
  defenseMultiplier: number;
  speedComparison: "faster" | "slower" | "unknown";
  dangerousMoves: string[];
  backupSlot?: TeamSlot;
  backupMove?: string;
}

export interface BattleStrategy {
  trainer: Trainer;
  assignments: BattleAssignment[];
  leadPokemon: TeamSlot;
  notes: string[];
}

/**
 * Find the best move from a slot's moveData against an opponent's types.
 * Returns [moveName, moveType, effectiveness] or null if no moveData.
 */
function bestMoveAgainst(
  slot: TeamSlot,
  opponentTypes: PokemonType[]
): { name: string; type: PokemonType; effectiveness: number } | null {
  if (!slot.moveData || slot.moveData.length === 0) return null;

  let best: { name: string; type: PokemonType; effectiveness: number } | null = null;

  for (const move of slot.moveData) {
    if (move.category === "status") continue;
    const eff = getEffectivenessAgainst(move.type, opponentTypes);
    const power = move.power ?? 0;
    // Weight by both effectiveness and power for better move selection
    const score = eff * (power || 40);
    if (!best || score > best.effectiveness) {
      best = { name: move.name, type: move.type, effectiveness: score };
    }
  }

  // Normalize: recalculate raw effectiveness for the chosen move
  if (best) {
    best = {
      ...best,
      effectiveness: getEffectivenessAgainst(best.type, opponentTypes),
    };
  }

  return best;
}

/**
 * Score a team slot as a counter for a given opponent Pokemon.
 */
function scoreCounter(
  slot: TeamSlot,
  opponent: TrainerPokemon,
  allPokemon: Pokemon[],
  assignedIds: Set<string>
): number {
  const opponentTypes = opponent.types as PokemonType[];
  const slotTypes = slot.types as PokemonType[];

  // Offense: best move effectiveness, or STAB type effectiveness fallback
  let offenseScore = 0;
  const bestMove = bestMoveAgainst(slot, opponentTypes);
  if (bestMove) {
    offenseScore = bestMove.effectiveness;
  } else {
    // Fallback: best STAB type effectiveness
    for (const t of slotTypes) {
      const eff = getEffectivenessAgainst(t, opponentTypes);
      if (eff > offenseScore) offenseScore = eff;
    }
  }

  // Defense: how much damage opponent deals to us
  let defenseScore = 0;
  if (opponent.moves.length > 0) {
    // Check actual move types from opponent data
    const opponentPokemon = allPokemon.find((p) => p.id === opponent.pokemonId);
    if (opponentPokemon) {
      for (const moveName of opponent.moves) {
        const moveData = opponentPokemon.learnset.find((m) => m.name === moveName);
        if (moveData && moveData.category !== "status") {
          const eff = getEffectivenessAgainst(moveData.type, slotTypes);
          if (eff > defenseScore) defenseScore = eff;
        }
      }
    }
  }
  if (defenseScore === 0) {
    // Fallback: STAB type effectiveness
    for (const t of opponentTypes) {
      const eff = getEffectivenessAgainst(t, slotTypes);
      if (eff > defenseScore) defenseScore = eff;
    }
  }

  // Composite score: reward high offense, penalize high incoming damage
  let score = offenseScore * 100 - defenseScore * 50;

  // Speed bonus
  const ourPokemon = allPokemon.find((p) => p.id === slot.pokemonId);
  const theirPokemon = allPokemon.find((p) => p.id === opponent.pokemonId);
  if (ourPokemon && theirPokemon && ourPokemon.baseStats.speed > 0 && theirPokemon.baseStats.speed > 0) {
    if (ourPokemon.baseStats.speed > theirPokemon.baseStats.speed) {
      score += 15;
    }
  }

  // Penalty for double-duty
  if (assignedIds.has(slot.pokemonId)) {
    score -= 30;
  }

  return score;
}

/**
 * Compute a battle strategy for a given trainer encounter.
 */
export function computeBattleStrategy(
  trainer: Trainer,
  trainerTeam: TrainerPokemon[],
  filledSlots: TeamSlot[],
  allPokemon: Pokemon[]
): BattleStrategy {
  const assignments: BattleAssignment[] = [];
  const assignedIds = new Set<string>();
  const notes: string[] = [];

  for (const opponent of trainerTeam) {
    const opponentTypes = opponent.types as PokemonType[];

    // Score all team members
    const scored = filledSlots.map((slot) => ({
      slot,
      score: scoreCounter(slot, opponent, allPokemon, assignedIds),
    }));
    scored.sort((a, b) => b.score - a.score);

    const bestCounter = scored[0];
    if (!bestCounter) continue;

    const slot = bestCounter.slot;
    const slotTypes = slot.types as PokemonType[];

    // Best move
    const bestMove = bestMoveAgainst(slot, opponentTypes);
    let moveName = bestMove?.name ?? slotTypes[0].toUpperCase() + " STAB";
    let moveType = bestMove?.type ?? slotTypes[0];
    const offenseMultiplier = bestMove?.effectiveness
      ?? Math.max(...slotTypes.map((t) => getEffectivenessAgainst(t, opponentTypes)));

    // Defense multiplier
    let defenseMultiplier = 1;
    if (opponent.moves.length > 0) {
      const opponentPokemon = allPokemon.find((p) => p.id === opponent.pokemonId);
      if (opponentPokemon) {
        for (const mn of opponent.moves) {
          const md = opponentPokemon.learnset.find((m) => m.name === mn);
          if (md && md.category !== "status") {
            const eff = getEffectivenessAgainst(md.type, slotTypes);
            if (eff > defenseMultiplier) defenseMultiplier = eff;
          }
        }
      }
    } else {
      for (const t of opponentTypes) {
        const eff = getEffectivenessAgainst(t, slotTypes);
        if (eff > defenseMultiplier) defenseMultiplier = eff;
      }
    }

    // Speed comparison
    let speedComparison: "faster" | "slower" | "unknown" = "unknown";
    const ourPokemon = allPokemon.find((p) => p.id === slot.pokemonId);
    const theirPokemon = allPokemon.find((p) => p.id === opponent.pokemonId);
    if (ourPokemon && theirPokemon && ourPokemon.baseStats.speed > 0 && theirPokemon.baseStats.speed > 0) {
      speedComparison = ourPokemon.baseStats.speed > theirPokemon.baseStats.speed
        ? "faster" : "slower";
    }

    // Dangerous opponent moves (SE against our counter)
    const dangerousMoves: string[] = [];
    if (opponent.moves.length > 0) {
      const opponentPokemon = allPokemon.find((p) => p.id === opponent.pokemonId);
      if (opponentPokemon) {
        for (const mn of opponent.moves) {
          const md = opponentPokemon.learnset.find((m) => m.name === mn);
          if (md && md.category !== "status") {
            const eff = getEffectivenessAgainst(md.type, slotTypes);
            if (eff > 1) dangerousMoves.push(mn);
          }
        }
      }
    }

    // Backup: second best scorer, preferring unassigned
    const backup = scored.find(
      (s) => s.slot.pokemonId !== slot.pokemonId
    );
    let backupSlot: TeamSlot | undefined;
    let backupMove: string | undefined;
    if (backup) {
      backupSlot = backup.slot;
      const backupBestMove = bestMoveAgainst(backup.slot, opponentTypes);
      backupMove = backupBestMove?.name;
    }

    assignedIds.add(slot.pokemonId);

    assignments.push({
      opponentPokemon: opponent,
      counterSlot: slot,
      recommendedMove: moveName,
      moveType,
      offenseMultiplier,
      defenseMultiplier,
      speedComparison,
      dangerousMoves,
      backupSlot,
      backupMove,
    });
  }

  // Lead: the counter assigned to the first opponent
  const leadPokemon = assignments[0]?.counterSlot ?? filledSlots[0];

  // Notes
  if (trainer.name === "Mel") {
    notes.push("Mel uses Inverse Battles -- type matchups are reversed!");
  }

  return { trainer, assignments, leadPokemon, notes };
}

/**
 * Find the next trainer encounter the player hasn't beaten yet.
 */
export function getNextEncounter(
  allTrainers: Trainer[],
  completedMilestones: string[],
  badgeCount: number,
  difficulty: Difficulty
): { trainer: Trainer; team: TrainerPokemon[] } | null {
  // Sort trainers by their milestone order (approximate via badge/story progression)
  const milestoneOrder = completedMilestones;

  // Filter to trainers whose prerequisite is met but whose reward hasn't been earned
  const candidates = allTrainers.filter((t) => {
    // Prerequisite met?
    if (t.milestoneRequired && t.milestoneRequired !== "game_start") {
      if (!completedMilestones.includes(t.milestoneRequired)) return false;
    }
    // Not yet beaten? (if trainer awards a badge, check if that badge is completed)
    if (t.badgeAwarded && completedMilestones.includes(t.badgeAwarded)) return false;
    // For non-badge trainers (rivals, admins), check if their own id is in completed
    if (!t.badgeAwarded && completedMilestones.includes(t.id)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Prioritize gym leaders/E4/champion over rival/admin battles
  const prioritized = [...candidates].sort((a, b) => {
    const priority = (t: Trainer) =>
      t.badgeAwarded ? 0 :
      t.title === "Elite Four" || t.title === "Champion" ? 0 : 1;
    return priority(a) - priority(b);
  });

  const trainer = prioritized[0];

  // Resolve team for difficulty
  const difficultyOrder: Difficulty[] = [difficulty, "insane", "expert", "difficult", "vanilla"];
  let team: TrainerPokemon[] = [];
  for (const d of difficultyOrder) {
    const t = trainer.teams[d];
    if (t && t.length > 0) {
      team = t;
      break;
    }
  }

  return { trainer, team };
}
