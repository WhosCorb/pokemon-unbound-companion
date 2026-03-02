/**
 * Trainer Scraper (Stub) for Pokemon Unbound Companion
 *
 * Outputs a manually curated list of key trainers (gym leaders) with their
 * expert-mode teams. This is a stub that will eventually be replaced by a
 * scraper that pulls data from the Miraheze wiki API at:
 *   https://pokemonunbound.miraheze.org/w/api.php
 *
 * Output: data/trainers.json
 *
 * Run: npx tsx scripts/scrapers/trainers.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrainerPokemon {
  pokemonId: string;
  pokemonName: string;
  types: string[];
  level: number;
  moves: string[];
}

interface Trainer {
  id: string;
  name: string;
  title: string;
  locationId: string;
  specialtyType: string;
  milestoneRequired: string;
  badgeAwarded: string;
  teams: {
    expert: TrainerPokemon[];
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "trainers.json");

// ---------------------------------------------------------------------------
// Curated Trainer Data
// ---------------------------------------------------------------------------

const trainers: Trainer[] = [
  {
    id: "gym_1_mel",
    name: "Mel",
    title: "Gym Leader",
    locationId: "dehara_city",
    specialtyType: "fire",
    milestoneRequired: "reach_fallshore",
    badgeAwarded: "badge_1",
    teams: {
      expert: [
        {
          pokemonId: "arcanine",
          pokemonName: "Arcanine",
          types: ["fire"],
          level: 18,
          moves: ["Flame Wheel", "Bite", "Extreme Speed", "Will-O-Wisp"],
        },
        {
          pokemonId: "magcargo",
          pokemonName: "Magcargo",
          types: ["fire", "rock"],
          level: 18,
          moves: [
            "Rock Slide",
            "Flame Wheel",
            "Shell Smash",
            "Earth Power",
          ],
        },
        {
          pokemonId: "talonflame",
          pokemonName: "Talonflame",
          types: ["fire", "flying"],
          level: 19,
          moves: ["Acrobatics", "Flame Charge", "Swords Dance", "Roost"],
        },
      ],
    },
  },
  {
    id: "gym_2_tessy",
    name: "Tessy",
    title: "Gym Leader",
    locationId: "seaport_city",
    specialtyType: "water",
    milestoneRequired: "badge_1",
    badgeAwarded: "badge_2",
    teams: {
      expert: [
        {
          pokemonId: "pelipper",
          pokemonName: "Pelipper",
          types: ["water", "flying"],
          level: 28,
          moves: ["Scald", "Hurricane", "U-turn", "Roost"],
        },
        {
          pokemonId: "ludicolo",
          pokemonName: "Ludicolo",
          types: ["water", "grass"],
          level: 28,
          moves: ["Scald", "Giga Drain", "Ice Beam", "Rain Dance"],
        },
        {
          pokemonId: "swampert",
          pokemonName: "Swampert",
          types: ["water", "ground"],
          level: 29,
          moves: ["Waterfall", "Earthquake", "Ice Punch", "Stealth Rock"],
        },
      ],
    },
  },
  {
    id: "gym_3_roxanne",
    name: "Roxanne",
    title: "Gym Leader",
    locationId: "vivill_town",
    specialtyType: "rock",
    milestoneRequired: "badge_2",
    badgeAwarded: "badge_3",
    teams: {
      expert: [
        {
          pokemonId: "lycanroc",
          pokemonName: "Lycanroc",
          types: ["rock"],
          level: 36,
          moves: [
            "Stone Edge",
            "Accelerock",
            "Drill Run",
            "Swords Dance",
          ],
        },
        {
          pokemonId: "tyranitar",
          pokemonName: "Tyranitar",
          types: ["rock", "dark"],
          level: 36,
          moves: [
            "Stone Edge",
            "Crunch",
            "Earthquake",
            "Dragon Dance",
          ],
        },
        {
          pokemonId: "aerodactyl",
          pokemonName: "Aerodactyl",
          types: ["rock", "flying"],
          level: 37,
          moves: [
            "Stone Edge",
            "Dual Wingbeat",
            "Earthquake",
            "Roost",
          ],
        },
      ],
    },
  },
  {
    id: "gym_4_galavan",
    name: "Galavan",
    title: "Gym Leader",
    locationId: "antisis_city",
    specialtyType: "electric",
    milestoneRequired: "badge_3",
    badgeAwarded: "badge_4",
    teams: {
      expert: [
        {
          pokemonId: "vikavolt",
          pokemonName: "Vikavolt",
          types: ["bug", "electric"],
          level: 42,
          moves: [
            "Thunderbolt",
            "Bug Buzz",
            "Energy Ball",
            "Volt Switch",
          ],
        },
        {
          pokemonId: "toxtricity",
          pokemonName: "Toxtricity",
          types: ["electric", "poison"],
          level: 42,
          moves: [
            "Overdrive",
            "Sludge Wave",
            "Boomburst",
            "Shift Gear",
          ],
        },
        {
          pokemonId: "electivire",
          pokemonName: "Electivire",
          types: ["electric"],
          level: 43,
          moves: [
            "Wild Charge",
            "Ice Punch",
            "Cross Chop",
            "Earthquake",
          ],
        },
      ],
    },
  },
  {
    id: "gym_5_miriam",
    name: "Miriam",
    title: "Gym Leader",
    locationId: "serenity_isle",
    specialtyType: "fairy",
    milestoneRequired: "badge_4",
    badgeAwarded: "badge_5",
    teams: {
      expert: [
        {
          pokemonId: "grimmsnarl",
          pokemonName: "Grimmsnarl",
          types: ["dark", "fairy"],
          level: 48,
          moves: [
            "Spirit Break",
            "Sucker Punch",
            "Thunder Wave",
            "Bulk Up",
          ],
        },
        {
          pokemonId: "togekiss",
          pokemonName: "Togekiss",
          types: ["fairy", "flying"],
          level: 48,
          moves: [
            "Dazzling Gleam",
            "Air Slash",
            "Nasty Plot",
            "Roost",
          ],
        },
        {
          pokemonId: "hatterene",
          pokemonName: "Hatterene",
          types: ["psychic", "fairy"],
          level: 48,
          moves: [
            "Dazzling Gleam",
            "Psychic",
            "Mystical Fire",
            "Calm Mind",
          ],
        },
        {
          pokemonId: "sylveon",
          pokemonName: "Sylveon",
          types: ["fairy"],
          level: 49,
          moves: [
            "Hyper Voice",
            "Mystical Fire",
            "Calm Mind",
            "Wish",
          ],
        },
      ],
    },
  },
  {
    id: "gym_6_gail",
    name: "Gail",
    title: "Gym Leader",
    locationId: "crater_town",
    specialtyType: "flying",
    milestoneRequired: "badge_5",
    badgeAwarded: "badge_6",
    teams: {
      expert: [
        {
          pokemonId: "corviknight",
          pokemonName: "Corviknight",
          types: ["flying", "steel"],
          level: 54,
          moves: [
            "Brave Bird",
            "Iron Head",
            "Bulk Up",
            "Roost",
          ],
        },
        {
          pokemonId: "noivern",
          pokemonName: "Noivern",
          types: ["flying", "dragon"],
          level: 54,
          moves: [
            "Hurricane",
            "Draco Meteor",
            "Flamethrower",
            "U-turn",
          ],
        },
        {
          pokemonId: "hawlucha",
          pokemonName: "Hawlucha",
          types: ["fighting", "flying"],
          level: 55,
          moves: [
            "Acrobatics",
            "Close Combat",
            "Swords Dance",
            "Thunder Punch",
          ],
        },
      ],
    },
  },
  {
    id: "gym_7_hector",
    name: "Hector",
    title: "Gym Leader",
    locationId: "frozen_heights",
    specialtyType: "ice",
    milestoneRequired: "badge_6",
    badgeAwarded: "badge_7",
    teams: {
      expert: [
        {
          pokemonId: "weavile",
          pokemonName: "Weavile",
          types: ["dark", "ice"],
          level: 60,
          moves: [
            "Triple Axel",
            "Knock Off",
            "Ice Shard",
            "Swords Dance",
          ],
        },
        {
          pokemonId: "mamoswine",
          pokemonName: "Mamoswine",
          types: ["ice", "ground"],
          level: 60,
          moves: [
            "Icicle Crash",
            "Earthquake",
            "Ice Shard",
            "Stealth Rock",
          ],
        },
        {
          pokemonId: "lapras",
          pokemonName: "Lapras",
          types: ["water", "ice"],
          level: 61,
          moves: [
            "Freeze-Dry",
            "Surf",
            "Thunderbolt",
            "Perish Song",
          ],
        },
      ],
    },
  },
  {
    id: "gym_8_zeph",
    name: "Zeph",
    title: "Gym Leader",
    locationId: "crystal_peak",
    specialtyType: "dragon",
    milestoneRequired: "badge_7",
    badgeAwarded: "badge_8",
    teams: {
      expert: [
        {
          pokemonId: "dragapult",
          pokemonName: "Dragapult",
          types: ["dragon", "ghost"],
          level: 66,
          moves: [
            "Dragon Darts",
            "Shadow Ball",
            "Thunderbolt",
            "U-turn",
          ],
        },
        {
          pokemonId: "garchomp",
          pokemonName: "Garchomp",
          types: ["dragon", "ground"],
          level: 66,
          moves: [
            "Dragon Claw",
            "Earthquake",
            "Stone Edge",
            "Swords Dance",
          ],
        },
        {
          pokemonId: "kommo_o",
          pokemonName: "Kommo-o",
          types: ["dragon", "fighting"],
          level: 67,
          moves: [
            "Clanging Scales",
            "Close Combat",
            "Poison Jab",
            "Stealth Rock",
          ],
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[trainers] Building trainer data (stub -- curated data)...");
  console.log(`[trainers] Total trainers: ${trainers.length}`);

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  await writeFile(OUTPUT_FILE, JSON.stringify(trainers, null, 2), "utf-8");

  console.log(`[trainers] Wrote ${trainers.length} trainers to ${OUTPUT_FILE}`);

  // Print summary
  console.log("\n[trainers] Roster:");
  for (const t of trainers) {
    const teamSize = t.teams.expert.length;
    const levels = t.teams.expert.map((p) => p.level);
    const levelRange = `Lv ${Math.min(...levels)}-${Math.max(...levels)}`;
    console.log(
      `  ${t.badgeAwarded}: ${t.name} (${t.specialtyType}) @ ${t.locationId} -- ${teamSize} Pokemon, ${levelRange}`
    );
  }

  // Note about future scraper implementation
  console.log(
    "\n[trainers] NOTE: This is a stub scraper using curated data."
  );
  console.log(
    "[trainers] Future implementation will pull from the Miraheze wiki API:"
  );
  console.log(
    "[trainers]   https://pokemonunbound.miraheze.org/w/api.php?action=parse&page=PAGE_NAME&prop=wikitext&format=json"
  );
}

main().catch((err) => {
  console.error("[trainers] Fatal error:", err);
  process.exit(1);
});
