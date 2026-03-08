/**
 * Infer game progress from parsed save data.
 *
 * Uses badge flags from the save file and party level analysis to suggest
 * which milestones the player has likely completed.
 */

import type { SavePlayerInfo, SavePokemon, PcBoxData } from "./save-parser";

export interface SaveHeuristics {
  suggestedMilestones: string[];
  confidence: "high" | "medium" | "low";
}

// Badge flag bit positions -> milestone IDs (Unbound has 8 gym badges)
const BADGE_MILESTONES: { bit: number; milestoneId: string }[] = [
  { bit: 0, milestoneId: "badge_1" },
  { bit: 1, milestoneId: "badge_2" },
  { bit: 2, milestoneId: "badge_3" },
  { bit: 3, milestoneId: "badge_4" },
  { bit: 4, milestoneId: "badge_5" },
  { bit: 5, milestoneId: "badge_6" },
  { bit: 6, milestoneId: "badge_7" },
  { bit: 7, milestoneId: "badge_8" },
];

// Milestones that precede each badge (story + HM unlocks)
// If badge N is earned, all prior story milestones are complete
const MILESTONE_CHAIN: string[] = [
  "game_start",
  "reach_frozen_heights",
  "professor_log",
  "reach_dresco",
  "badge_1",
  "hm_cut",
  "reach_crater_town",
  "badge_2",
  "reach_blizzard_city",
  "badge_3",
  "hm_surf",
  "reach_fallshore",
  "badge_4",
  "hm_strength",
  "reach_dehara",
  "badge_5",
  "hm_fly",
  "reach_antisis",
  "badge_6",
  "hm_waterfall",
  "reach_polder",
  "badge_7",
  "hm_dive",
  "reach_redwood",
  "badge_8",
  "victory_road",
  "elite_four",
  "champion",
  "post_game",
];

/**
 * Infer milestones from save data.
 *
 * Primary signal: badge flags from the save file.
 * Secondary signal: party level average for estimating story progress
 * when badge flags read as 0 (possible CFRU offset issue).
 */
export function inferProgress(
  player: SavePlayerInfo,
  party: SavePokemon[],
  _pc: PcBoxData[],
): SaveHeuristics {
  const milestones = new Set<string>();
  milestones.add("game_start");

  const badgeCount = countBadges(player.badgeFlags);

  if (badgeCount > 0) {
    // Badge flags are available -- use them as primary signal
    addMilestonesUpToBadge(milestones, badgeCount);
    return {
      suggestedMilestones: [...milestones],
      confidence: "high",
    };
  }

  // Badge flags are 0 -- either the player truly has 0 badges,
  // or CFRU stores them at a different offset. Use party levels as fallback.
  const avgLevel = party.length > 0
    ? party.reduce((sum, p) => sum + p.level, 0) / party.length
    : 0;

  if (avgLevel < 5) {
    // Very early game, just started
    return { suggestedMilestones: [...milestones], confidence: "medium" };
  }

  // Level-based heuristics for Unbound's progression
  const levelEstimates: { minAvg: number; badge: number }[] = [
    { minAvg: 12, badge: 1 },  // Gym 1 ~Lv.14
    { minAvg: 18, badge: 2 },  // Gym 2 ~Lv.21
    { minAvg: 24, badge: 3 },  // Gym 3 ~Lv.28
    { minAvg: 30, badge: 4 },  // Gym 4 ~Lv.33
    { minAvg: 36, badge: 5 },  // Gym 5 ~Lv.38
    { minAvg: 42, badge: 6 },  // Gym 6 ~Lv.44
    { minAvg: 48, badge: 7 },  // Gym 7 ~Lv.50
    { minAvg: 55, badge: 8 },  // Gym 8 ~Lv.56
    { minAvg: 65, badge: 9 },  // E4 ~Lv.65+
  ];

  let estimatedBadges = 0;
  for (const est of levelEstimates) {
    if (avgLevel >= est.minAvg) estimatedBadges = est.badge;
  }

  if (estimatedBadges > 0) {
    addMilestonesUpToBadge(milestones, Math.min(estimatedBadges, 8));
    if (estimatedBadges >= 9) {
      milestones.add("victory_road");
      milestones.add("elite_four");
    }
  } else {
    // Player has Pokemon but likely pre-badge
    milestones.add("reach_frozen_heights");
    milestones.add("professor_log");
    if (avgLevel >= 8) {
      milestones.add("reach_dresco");
    }
  }

  return {
    suggestedMilestones: [...milestones],
    confidence: "low",
  };
}

function countBadges(flags: number): number {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (flags & (1 << i)) count++;
  }
  return count;
}

function addMilestonesUpToBadge(milestones: Set<string>, badgeCount: number): void {
  // Find the index of the Nth badge in the chain and include everything before it
  let badgesSeen = 0;
  for (const milestone of MILESTONE_CHAIN) {
    milestones.add(milestone);
    if (milestone.startsWith("badge_")) {
      badgesSeen++;
      if (badgesSeen >= badgeCount) break;
    }
  }
}
