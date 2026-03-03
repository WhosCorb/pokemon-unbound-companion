/**
 * Walkthrough boss trainer data for Pokemon Unbound.
 *
 * Adds Rival (Ace), Shadow Admin (Ivory, Marlon, Zeph) battles
 * to trainers.json. Data sourced from:
 *   - https://pokemonunbound.miraheze.org/wiki/Ace
 *   - https://pokemonunbound.miraheze.org/wiki/Marlon
 *   - https://pokemonunbound.miraheze.org/wiki/Ivory
 *   - https://pokemonunbound.miraheze.org/wiki/Zeph
 *
 * Run: npx tsx scripts/scrapers/walkthrough-bosses.ts
 */

import * as fs from "fs";
import * as path from "path";

interface TrainerPokemon {
  pokemonId: string;
  pokemonName: string;
  types: string[];
  level: number;
  moves: string[];
  ability?: string;
  item?: string;
}

interface Trainer {
  id: string;
  name: string;
  title: string;
  locationId: string;
  specialtyType?: string;
  teams: Record<string, TrainerPokemon[]>;
  milestoneRequired: string;
  badgeAwarded?: string;
}

const bossTrainers: Trainer[] = [
  // ── Rival (Ace) Battles ──────────────────────────

  {
    id: "rival_1_frozen_heights",
    name: "Ace",
    title: "Rival",
    locationId: "frozen_heights",
    milestoneRequired: "reach_frozen_heights",
    teams: {
      expert: [
        {
          pokemonId: "larvitar",
          pokemonName: "Larvitar",
          types: ["rock", "ground"],
          level: 10,
          moves: ["Bite", "Scary Face", "Rock Tomb", "Screech"],
          ability: "Guts",
        },
      ],
    },
  },
  {
    id: "rival_2_icicle_cave",
    name: "Ace",
    title: "Rival",
    locationId: "icicle_cave",
    milestoneRequired: "reach_frozen_heights",
    teams: {
      expert: [
        {
          pokemonId: "swinub",
          pokemonName: "Swinub",
          types: ["ice", "ground"],
          level: 18,
          moves: ["Icy Wind", "Flail", "Powder Snow", "Mud Slap"],
          ability: "Oblivious",
        },
        {
          pokemonId: "larvitar",
          pokemonName: "Larvitar",
          types: ["rock", "ground"],
          level: 19,
          moves: ["Bite", "Scary Face", "Rock Tomb", "Screech"],
          ability: "Guts",
        },
      ],
    },
  },
  {
    id: "rival_3_frost_mountain",
    name: "Ace",
    title: "Rival",
    locationId: "frost_mountain",
    milestoneRequired: "badge_2",
    teams: {
      expert: [
        {
          pokemonId: "toucannon",
          pokemonName: "Toucannon",
          types: ["normal", "flying"],
          level: 32,
          moves: ["Pluck", "Fury Attack", "Rock Blast", "Roost"],
          ability: "Skill Link",
        },
        {
          pokemonId: "swinub",
          pokemonName: "Swinub",
          types: ["ice", "ground"],
          level: 32,
          moves: ["Ice Shard", "Mud Bomb", "Mist", "Flail"],
          ability: "Oblivious",
        },
        {
          pokemonId: "metang",
          pokemonName: "Metang",
          types: ["steel", "psychic"],
          level: 33,
          moves: ["Bullet Punch", "Confusion", "Pursuit", "Magnet Rise"],
          ability: "Clear Body",
        },
      ],
    },
  },
  {
    id: "rival_4_route_12",
    name: "Ace",
    title: "Rival",
    locationId: "route_12",
    milestoneRequired: "badge_4",
    teams: {
      expert: [
        {
          pokemonId: "mamoswine",
          pokemonName: "Mamoswine",
          types: ["ice", "ground"],
          level: 41,
          moves: ["Ice Fang", "Bulldoze", "Ice Shard", "Stealth Rock"],
          ability: "Thick Fat",
          item: "Focus Sash",
        },
        {
          pokemonId: "toucannon",
          pokemonName: "Toucannon",
          types: ["normal", "flying"],
          level: 40,
          moves: ["Pluck", "Fury Attack", "Rock Blast", "Roost"],
          ability: "Skill Link",
        },
        {
          pokemonId: "vaporeon",
          pokemonName: "Vaporeon",
          types: ["water"],
          level: 41,
          moves: ["Water Pulse", "Aurora Beam", "Quick Attack", "Aqua Ring"],
          ability: "Water Absorb",
          item: "Sitrus Berry",
        },
        {
          pokemonId: "fraxure",
          pokemonName: "Fraxure",
          types: ["dragon"],
          level: 41,
          moves: ["Dual Chop", "Crunch", "Rock Tomb", "Dragon Dance"],
          ability: "Mold Breaker",
        },
        {
          pokemonId: "metang",
          pokemonName: "Metang",
          types: ["steel", "psychic"],
          level: 42,
          moves: ["Iron Head", "Psychic", "Hammer Arm", "Magnet Rise"],
          ability: "Clear Body",
          item: "Metagrossite",
        },
      ],
    },
  },
  {
    id: "rival_5_crystal_peak",
    name: "Ace",
    title: "Rival",
    locationId: "crystal_peak",
    milestoneRequired: "badge_7",
    teams: {
      expert: [
        {
          pokemonId: "toucannon",
          pokemonName: "Toucannon",
          types: ["normal", "flying"],
          level: 54,
          moves: [],
        },
        {
          pokemonId: "vaporeon",
          pokemonName: "Vaporeon",
          types: ["water"],
          level: 55,
          moves: [],
        },
        {
          pokemonId: "mamoswine",
          pokemonName: "Mamoswine",
          types: ["ice", "ground"],
          level: 56,
          moves: [],
        },
        {
          pokemonId: "haxorus",
          pokemonName: "Haxorus",
          types: ["dragon"],
          level: 56,
          moves: [],
        },
        {
          pokemonId: "metagross",
          pokemonName: "Metagross",
          types: ["steel", "psychic"],
          level: 58,
          moves: [],
          item: "Metagrossite",
        },
      ],
    },
  },

  // ── Shadow Admin Ivory ──────────────────────────

  {
    id: "ivory_1_cinder_volcano",
    name: "Ivory",
    title: "Shadow Admin",
    locationId: "cinder_volcano",
    milestoneRequired: "badge_1",
    teams: {
      expert: [
        {
          pokemonId: "misdreavus",
          pokemonName: "Misdreavus",
          types: ["ghost"],
          level: 27,
          moves: ["Hex", "Will-O-Wisp", "Mean Look", "Confuse Ray"],
          ability: "Levitate",
        },
        {
          pokemonId: "kadabra",
          pokemonName: "Kadabra",
          types: ["psychic"],
          level: 28,
          moves: ["Psybeam", "Charge Beam", "Tri-Attack", "Night Shade"],
          ability: "Synchronize",
        },
        {
          pokemonId: "vullaby",
          pokemonName: "Vullaby",
          types: ["dark", "flying"],
          level: 26,
          moves: ["Punishment", "Pluck", "Rock Tomb", "Flatter"],
          ability: "Overcoat",
          item: "Eviolite",
        },
      ],
    },
  },

  // ── Shadow Boss Zeph ──────────────────────────

  {
    id: "zeph_1_cinder_volcano",
    name: "Zeph",
    title: "Shadow Boss",
    locationId: "cinder_volcano",
    specialtyType: "dark",
    milestoneRequired: "badge_1",
    teams: {
      expert: [
        {
          pokemonId: "houndoom",
          pokemonName: "Houndoom",
          types: ["dark", "fire"],
          level: 27,
          moves: ["Incinerate", "Thunder Fang", "Sucker Punch", "Howl"],
          ability: "Flash Fire",
          item: "Houndoominite",
        },
      ],
    },
  },

  // ── Shadow Admin Marlon ──────────────────────────

  {
    id: "marlon_1_cinder_volcano",
    name: "Marlon",
    title: "Shadow Admin",
    locationId: "cinder_volcano",
    specialtyType: "dark",
    milestoneRequired: "badge_1",
    teams: {
      expert: [
        {
          pokemonId: "sableye",
          pokemonName: "Sableye",
          types: ["dark", "ghost"],
          level: 25,
          moves: ["Night Shade", "Fake Out", "Will-O-Wisp", "Torment"],
          ability: "Prankster",
        },
        {
          pokemonId: "shiftry",
          pokemonName: "Shiftry",
          types: ["grass", "dark"],
          level: 27,
          moves: ["Leaf Tornado", "Sucker Punch", "Extrasensory", "Fake Out"],
          ability: "Chlorophyll",
        },
        {
          pokemonId: "duskull",
          pokemonName: "Duskull",
          types: ["ghost"],
          level: 26,
          moves: ["Shadow Sneak", "Night Shade", "Payback", "Destiny Bond"],
          ability: "Levitate",
          item: "Eviolite",
        },
        {
          pokemonId: "cacnea",
          pokemonName: "Cacnea",
          types: ["grass"],
          level: 27,
          moves: ["Needle Arm", "Feint Attack", "Thunder Punch", "Fell Stinger"],
          ability: "Sand Veil",
        },
        {
          pokemonId: "swoobat",
          pokemonName: "Swoobat",
          types: ["psychic", "flying"],
          level: 28,
          moves: ["Confusion", "Air Cutter", "Charge Beam", "Roost"],
          ability: "Unaware",
        },
      ],
    },
  },

  // ── Ivory Battle 2 ──────────────────────────

  {
    id: "ivory_2_route_9",
    name: "Ivory",
    title: "Shadow Admin",
    locationId: "route_9",
    milestoneRequired: "badge_3",
    teams: {
      expert: [
        {
          pokemonId: "meowstic",
          pokemonName: "Meowstic",
          types: ["psychic"],
          level: 37,
          moves: ["Psyshock", "Helping Hand", "Reflect", "Psychic Terrain"],
          ability: "Prankster",
          item: "Terrain Extender",
        },
        {
          pokemonId: "oranguru",
          pokemonName: "Oranguru",
          types: ["normal", "psychic"],
          level: 38,
          moves: ["Zen Headbutt", "Instruct", "Light Screen", "Psychic Terrain"],
          ability: "Inner Focus",
        },
        {
          pokemonId: "incineroar",
          pokemonName: "Incineroar",
          types: ["fire", "dark"],
          level: 38,
          moves: ["Fire Punch", "Darkest Lariat", "Thunder Punch", "Drain Punch"],
          ability: "Intimidate",
        },
        {
          pokemonId: "mismagius",
          pokemonName: "Mismagius",
          types: ["ghost"],
          level: 36,
          moves: ["Ominous Wind", "Power Gem", "Mystical Fire", "Destiny Bond"],
          ability: "Levitate",
        },
        {
          pokemonId: "alakazam",
          pokemonName: "Alakazam",
          types: ["psychic"],
          level: 37,
          moves: ["Psyshock", "Shadow Ball", "Dazzling Gleam", "Charge Beam"],
          ability: "Magic Guard",
        },
      ],
    },
  },

  // ── Marlon Battle 2 ──────────────────────────

  {
    id: "marlon_2_thundercap_mt",
    name: "Marlon",
    title: "Shadow Admin",
    locationId: "thundercap_mt",
    specialtyType: "dark",
    milestoneRequired: "badge_4",
    teams: {
      expert: [
        {
          pokemonId: "zapdos",
          pokemonName: "Zapdos",
          types: ["electric", "flying"],
          level: 41,
          moves: ["Discharge", "Hurricane", "Ancient Power", "Light Screen"],
          ability: "Pressure",
        },
        {
          pokemonId: "dusclops",
          pokemonName: "Dusclops",
          types: ["ghost"],
          level: 41,
          moves: ["Night Shade", "Ice Punch", "Confuse Ray", "Will-O-Wisp"],
          ability: "Pressure",
          item: "Eviolite",
        },
        {
          pokemonId: "sharpedo",
          pokemonName: "Sharpedo",
          types: ["water", "dark"],
          level: 41,
          moves: ["Aqua Jet", "Crunch", "Poison Fang", "Ice Fang"],
          ability: "Speed Boost",
          item: "Sharpedonite",
        },
        {
          pokemonId: "swoobat",
          pokemonName: "Swoobat",
          types: ["psychic", "flying"],
          level: 40,
          moves: ["Esper Wing", "Air Slash", "Shadow Ball", "Calm Mind"],
          ability: "Simple",
          item: "Scope Lens",
        },
        {
          pokemonId: "krookodile",
          pokemonName: "Krookodile",
          types: ["ground", "dark"],
          level: 42,
          moves: ["Stomping Tantrum", "Crunch", "Stone Edge", "Power-Up Punch"],
          ability: "Intimidate",
        },
      ],
    },
  },

  // ── Zeph Battle 2 ──────────────────────────

  {
    id: "zeph_2_shadow_base",
    name: "Zeph",
    title: "Shadow Boss",
    locationId: "shadow_base",
    specialtyType: "dark",
    milestoneRequired: "badge_4",
    teams: {
      expert: [
        {
          pokemonId: "mightyena",
          pokemonName: "Mightyena",
          types: ["dark"],
          level: 45,
          moves: ["Sucker Punch", "Ice Fang", "Psychic Fangs", "Swagger"],
          ability: "Strong Jaw",
        },
        {
          pokemonId: "gengar",
          pokemonName: "Gengar",
          types: ["ghost", "poison"],
          level: 45,
          moves: ["Shadow Ball", "Venoshock", "Dazzling Gleam", "Toxic"],
          ability: "Levitate",
          item: "Gengarite",
        },
        {
          pokemonId: "umbreon",
          pokemonName: "Umbreon",
          types: ["dark"],
          level: 46,
          moves: ["Foul Play", "Toxic", "Confuse Ray", "Moonlight"],
          ability: "Synchronize",
          item: "Leftovers",
        },
        {
          pokemonId: "exploud",
          pokemonName: "Exploud",
          types: ["normal"],
          level: 44,
          moves: ["Hyper Voice", "Flamethrower", "Ice Beam", "Surf"],
          item: "Throat Spray",
        },
        {
          pokemonId: "decidueye",
          pokemonName: "Decidueye",
          types: ["grass", "ghost"],
          level: 46,
          moves: ["Leaf Blade", "Spirit Shackle", "Low Sweep", "Acrobatics"],
          ability: "Long Reach",
          item: "Yache Berry",
        },
        {
          pokemonId: "houndoom",
          pokemonName: "Houndoom",
          types: ["dark", "fire"],
          level: 81,
          moves: ["Fire Blast", "Fiery Wrath", "Sludge Bomb", "Nasty Plot"],
          ability: "Flash Fire",
          item: "Houndoominite",
        },
      ],
    },
  },
];

// ── Main ──────────────────────────────────

const trainersPath = path.resolve(__dirname, "../../data/trainers.json");
const existing: Trainer[] = JSON.parse(fs.readFileSync(trainersPath, "utf-8"));

// Merge: add new boss trainers, skip duplicates
const existingIds = new Set(existing.map((t) => t.id));
let added = 0;

for (const boss of bossTrainers) {
  if (!existingIds.has(boss.id)) {
    existing.push(boss);
    existingIds.add(boss.id);
    added++;
    console.log(`  Added: ${boss.title} ${boss.name} (${boss.id})`);
  } else {
    console.log(`  Skipped (exists): ${boss.id}`);
  }
}

fs.writeFileSync(trainersPath, JSON.stringify(existing, null, 2) + "\n");
console.log(`\nDone. Added ${added} boss trainers (total: ${existing.length}).`);
