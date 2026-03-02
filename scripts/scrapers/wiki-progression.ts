/**
 * Progression Scraper for Pokemon Unbound Companion
 *
 * Generates ordered milestone list matching the actual story flow
 * based on unboundwiki.com walkthrough data.
 *
 * Output: data/progression.json
 *
 * Run: npx tsx scripts/scrapers/wiki-progression.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const OUTPUT_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "progression.json");

interface Milestone {
  id: string;
  name: string;
  description: string;
  order: number;
  category: "badge" | "story" | "hm" | "post-game";
}

/**
 * Curated milestone data based on unboundwiki.com walkthrough.
 * The game starts in Shadow Base, then Frozen Heights.
 * Professor Log (not "Professor Ranger") is the main professor.
 */
const milestones: Milestone[] = [
  { id: "game_start", name: "Game Start", description: "Escape the Shadow Base and begin the journey", order: 1, category: "story" },
  { id: "reach_frozen_heights", name: "Reach Frozen Heights", description: "Arrive at Frozen Heights after escaping Shadow Base", order: 2, category: "story" },
  { id: "professor_log", name: "Meet Professor Log", description: "Pick up the package for Professor Log", order: 3, category: "story" },
  { id: "reach_dresco", name: "Reach Dresco Town", description: "Arrive at Dresco Town, home of the first gym", order: 4, category: "story" },
  { id: "badge_1", name: "Badge 1 - Dresco Town", description: "Defeat Gym Leader Mirskle (Fighting)", order: 5, category: "badge" },
  { id: "hm_cut", name: "Cut Unlocked", description: "Obtain the ability to use Cut in the field", order: 6, category: "hm" },
  { id: "reach_crater_town", name: "Reach Crater Town", description: "Arrive at Crater Town, home of the second gym", order: 7, category: "story" },
  { id: "badge_2", name: "Badge 2 - Crater Town", description: "Defeat Gym Leader Vega (Psychic)", order: 8, category: "badge" },
  { id: "reach_blizzard_city", name: "Reach Blizzard City", description: "Arrive at Blizzard City, home of the third gym", order: 9, category: "story" },
  { id: "badge_3", name: "Badge 3 - Blizzard City", description: "Defeat Gym Leader Alice (Ice)", order: 10, category: "badge" },
  { id: "hm_surf", name: "Surf Unlocked", description: "Obtain the ability to use Surf in the field", order: 11, category: "hm" },
  { id: "reach_fallshore", name: "Reach Fallshore City", description: "Arrive at Fallshore City, home of the fourth gym", order: 12, category: "story" },
  { id: "badge_4", name: "Badge 4 - Fallshore City", description: "Defeat Gym Leader Mel (Fire)", order: 13, category: "badge" },
  { id: "hm_strength", name: "Strength Unlocked", description: "Obtain the ability to use Strength in the field", order: 14, category: "hm" },
  { id: "reach_dehara", name: "Reach Dehara City", description: "Arrive at Dehara City, home of the fifth gym", order: 15, category: "story" },
  { id: "badge_5", name: "Badge 5 - Dehara City", description: "Defeat Gym Leader Galavan (Electric)", order: 16, category: "badge" },
  { id: "hm_fly", name: "Fly Unlocked", description: "Obtain the ability to use Fly in the field", order: 17, category: "hm" },
  { id: "reach_antisis", name: "Reach Antisis City", description: "Arrive at Antisis City, home of the sixth gym", order: 18, category: "story" },
  { id: "badge_6", name: "Badge 6 - Antisis City", description: "Defeat Gym Leader Big Mo (Ground)", order: 19, category: "badge" },
  { id: "hm_waterfall", name: "Waterfall Unlocked", description: "Obtain the ability to use Waterfall in the field", order: 20, category: "hm" },
  { id: "reach_polder", name: "Reach Polder Town", description: "Arrive at Polder Town, home of the seventh gym", order: 21, category: "story" },
  { id: "badge_7", name: "Badge 7 - Polder Town", description: "Defeat Gym Leader Tessy (Water)", order: 22, category: "badge" },
  { id: "hm_dive", name: "Dive Unlocked", description: "Obtain the ability to use Dive in the field", order: 23, category: "hm" },
  { id: "reach_redwood", name: "Reach Redwood Village", description: "Arrive at Redwood Village, home of the eighth gym", order: 24, category: "story" },
  { id: "badge_8", name: "Badge 8 - Redwood Village", description: "Defeat Gym Leader Benjamin (Dark)", order: 25, category: "badge" },
  { id: "victory_road", name: "Victory Road", description: "Access to Victory Road", order: 26, category: "story" },
  { id: "elite_four", name: "Elite Four", description: "Challenge the Elite Four", order: 27, category: "story" },
  { id: "champion", name: "Champion", description: "Defeat the Champion", order: 28, category: "story" },
  { id: "post_game", name: "Post-Game", description: "Post-game content unlocked", order: 29, category: "post-game" },
  { id: "post_game_battle_frontier", name: "Battle Frontier", description: "Access to the Battle Frontier", order: 30, category: "post-game" },
  { id: "post_game_raid_dens", name: "Raid Dens", description: "Access to all raid den locations", order: 31, category: "post-game" },
];

export async function scrapeProgression(): Promise<void> {
  console.log("[progression] Building progression data...");

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    JSON.stringify({ milestones }, null, 2),
    "utf-8"
  );

  console.log(`[progression] Wrote ${milestones.length} milestones to ${OUTPUT_FILE}`);

  // Summary
  const categories = milestones.reduce(
    (acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(`[progression] Categories: ${JSON.stringify(categories)}`);
}

// Allow direct execution
if (require.main === module) {
  scrapeProgression().catch((err) => {
    console.error("[progression] Fatal error:", err);
    process.exit(1);
  });
}
