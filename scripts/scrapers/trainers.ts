/**
 * Trainer Scraper for Pokemon Unbound Companion
 *
 * Curated trainer data for gym leaders, Elite Four, and Champion
 * based on unboundwiki.com data.
 *
 * Correct gym order (per unboundwiki.com):
 *   1. Mirskle (Grass/Fairy) -- Dresco Town -- Level Cap 20
 *   2. Vega (Dark) -- Crater Town -- Level Cap 26
 *   3. Alice (Flying) -- Blizzard City -- Level Cap 32
 *   4. Mel (Normal / Inverse Battle) -- Fallshore City -- Level Cap 36
 *   5. Galavan (Electric/Steel) -- Dehara City -- Level Cap 45
 *   6. Big Mo (Fighting) -- Antisis City -- Level Cap 52
 *   7. Tessy (Water) -- Polder Town -- Level Cap 57
 *   8. Benjamin (Bug) -- Redwood Village -- Level Cap 61
 *
 * Difficulties: Vanilla / Difficult / Expert / Insane
 *
 * Output: data/trainers.json
 * Run: npx tsx scripts/scrapers/trainers.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
  specialtyType: string;
  milestoneRequired: string;
  badgeAwarded?: string;
  teams: {
    vanilla?: TrainerPokemon[];
    difficult?: TrainerPokemon[];
    expert?: TrainerPokemon[];
    insane?: TrainerPokemon[];
  };
}

const OUTPUT_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "trainers.json");

const trainers: Trainer[] = [
  // ───────────────────────────────────────────────────────────
  // Gym 1: Mirskle -- Grass/Fairy -- Dresco Town -- Level Cap 20
  // Gym gimmick: Fog on battlefield; Rose Incense boosts defenses
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_1_mirskle",
    name: "Mirskle",
    title: "Gym Leader",
    locationId: "dresco_town",
    specialtyType: "grass",
    milestoneRequired: "reach_dresco",
    badgeAwarded: "badge_1",
    teams: {
      vanilla: [
        { pokemonId: "budew", pokemonName: "Budew", types: ["grass", "poison"], level: 14, moves: ["Mega Drain", "Stun Spore", "Growth", "Water Sport"] },
        { pokemonId: "flabebe", pokemonName: "Flabebe", types: ["fairy"], level: 14, moves: ["Fairy Wind", "Razor Leaf", "Wish", "Grassy Terrain"] },
        { pokemonId: "gloom", pokemonName: "Gloom", types: ["grass", "poison"], level: 15, moves: ["Mega Drain", "Acid", "Sleep Powder", "Moonlight"] },
      ],
      difficult: [
        { pokemonId: "budew", pokemonName: "Budew", types: ["grass", "poison"], level: 15, moves: ["Mega Drain", "Stun Spore", "Growth", "Extrasensory"] },
        { pokemonId: "floette", pokemonName: "Floette", types: ["fairy"], level: 15, moves: ["Fairy Wind", "Grass Knot", "Wish", "Grassy Terrain"] },
        { pokemonId: "weedle", pokemonName: "Weedle", types: ["bug", "poison"], level: 15, moves: ["Poison Sting", "String Shot", "Bug Bite", "Electroweb"] },
        { pokemonId: "gloom", pokemonName: "Gloom", types: ["grass", "poison"], level: 16, moves: ["Mega Drain", "Acid", "Sleep Powder", "Moonlight"] },
      ],
      expert: [
        { pokemonId: "roselia", pokemonName: "Roselia", types: ["grass", "poison"], level: 16, moves: ["Mega Drain", "Sludge Bomb", "Stun Spore", "Leech Seed"] },
        { pokemonId: "floette", pokemonName: "Floette", types: ["fairy"], level: 16, moves: ["Fairy Wind", "Grass Knot", "Wish", "Grassy Terrain"] },
        { pokemonId: "weedle", pokemonName: "Weedle", types: ["bug", "poison"], level: 16, moves: ["Poison Sting", "String Shot", "Bug Bite", "Electroweb"] },
        { pokemonId: "gloom", pokemonName: "Gloom", types: ["grass", "poison"], level: 17, moves: ["Giga Drain", "Sludge Bomb", "Sleep Powder", "Moonlight"] },
      ],
      insane: [
        { pokemonId: "roselia", pokemonName: "Roselia", types: ["grass", "poison"], level: 17, moves: ["Giga Drain", "Sludge Bomb", "Spikes", "Leech Seed"], ability: "Natural Cure" },
        { pokemonId: "floette", pokemonName: "Floette", types: ["fairy"], level: 17, moves: ["Dazzling Gleam", "Grass Knot", "Wish", "Calm Mind"], ability: "Flower Veil" },
        { pokemonId: "weedle", pokemonName: "Weedle", types: ["bug", "poison"], level: 17, moves: ["Poison Sting", "String Shot", "Bug Bite", "Electroweb"], ability: "Shield Dust", item: "Beedrillite" },
        { pokemonId: "budew", pokemonName: "Budew", types: ["grass", "poison"], level: 17, moves: ["Mega Drain", "Extrasensory", "Stun Spore", "Growth"], ability: "Poison Point" },
        { pokemonId: "gloom", pokemonName: "Gloom", types: ["grass", "poison"], level: 18, moves: ["Giga Drain", "Sludge Bomb", "Sleep Powder", "Moonlight"], ability: "Chlorophyll" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 2: Vega -- Dark -- Crater Town -- Level Cap 26
  // Gym gimmick: Negative energy damages non-Dark/Ghost/Psychic types
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_2_vega",
    name: "Vega",
    title: "Gym Leader",
    locationId: "crater_town",
    specialtyType: "dark",
    milestoneRequired: "badge_1",
    badgeAwarded: "badge_2",
    teams: {
      vanilla: [
        { pokemonId: "liepard", pokemonName: "Liepard", types: ["dark"], level: 22, moves: ["Fake Out", "Night Slash", "Play Rough", "U-turn"] },
        { pokemonId: "sneasel", pokemonName: "Sneasel", types: ["dark", "ice"], level: 22, moves: ["Quick Attack", "Icy Wind", "Knock Off", "Feint Attack"] },
        { pokemonId: "absol", pokemonName: "Absol", types: ["dark"], level: 23, moves: ["Night Slash", "Psycho Cut", "Detect", "Swords Dance"] },
      ],
      difficult: [
        { pokemonId: "liepard", pokemonName: "Liepard", types: ["dark"], level: 23, moves: ["Fake Out", "Night Slash", "Play Rough", "U-turn"] },
        { pokemonId: "sneasel", pokemonName: "Sneasel", types: ["dark", "ice"], level: 23, moves: ["Ice Punch", "Knock Off", "Quick Attack", "Swords Dance"] },
        { pokemonId: "spiritomb", pokemonName: "Spiritomb", types: ["ghost", "dark"], level: 24, moves: ["Shadow Ball", "Dark Pulse", "Will-O-Wisp", "Sucker Punch"] },
        { pokemonId: "absol", pokemonName: "Absol", types: ["dark"], level: 24, moves: ["Night Slash", "Psycho Cut", "Sucker Punch", "Swords Dance"] },
      ],
      expert: [
        { pokemonId: "liepard", pokemonName: "Liepard", types: ["dark"], level: 24, moves: ["Fake Out", "Night Slash", "Play Rough", "U-turn"] },
        { pokemonId: "honchkrow", pokemonName: "Honchkrow", types: ["dark", "flying"], level: 24, moves: ["Brave Bird", "Night Slash", "Sucker Punch", "Heat Wave"] },
        { pokemonId: "spiritomb", pokemonName: "Spiritomb", types: ["ghost", "dark"], level: 25, moves: ["Shadow Ball", "Dark Pulse", "Will-O-Wisp", "Sucker Punch"] },
        { pokemonId: "pawniard", pokemonName: "Pawniard", types: ["dark", "steel"], level: 25, moves: ["Iron Head", "Night Slash", "Sucker Punch", "Swords Dance"] },
        { pokemonId: "absol", pokemonName: "Absol", types: ["dark"], level: 26, moves: ["Night Slash", "Psycho Cut", "Sucker Punch", "Swords Dance"], item: "Absolite" },
      ],
      insane: [
        { pokemonId: "liepard", pokemonName: "Liepard", types: ["dark"], level: 25, moves: ["Fake Out", "Knock Off", "Play Rough", "U-turn"], ability: "Prankster" },
        { pokemonId: "honchkrow", pokemonName: "Honchkrow", types: ["dark", "flying"], level: 25, moves: ["Oblivion Wing", "Night Slash", "Sucker Punch", "Heat Wave"], ability: "Moxie" },
        { pokemonId: "spiritomb", pokemonName: "Spiritomb", types: ["ghost", "dark"], level: 25, moves: ["Shadow Ball", "Dark Pulse", "Will-O-Wisp", "Pain Split"], ability: "Pressure" },
        { pokemonId: "pawniard", pokemonName: "Pawniard", types: ["dark", "steel"], level: 26, moves: ["Iron Head", "Night Slash", "Sucker Punch", "Swords Dance"], ability: "Defiant" },
        { pokemonId: "absol", pokemonName: "Absol", types: ["dark"], level: 26, moves: ["Night Slash", "Psycho Cut", "Sucker Punch", "Swords Dance"], ability: "Super Luck", item: "Absolite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 3: Alice -- Flying -- Blizzard City -- Level Cap 32
  // Gym gimmick: Permanent Tailwind for Flying types; Insane: Strong Winds (Delta Stream)
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_3_alice",
    name: "Alice",
    title: "Gym Leader",
    locationId: "blizzard_city",
    specialtyType: "flying",
    milestoneRequired: "badge_2",
    badgeAwarded: "badge_3",
    teams: {
      vanilla: [
        { pokemonId: "minior", pokemonName: "Minior", types: ["rock", "flying"], level: 28, moves: ["Stealth Rock", "Shell Smash", "Acrobatics", "Power Gem"] },
        { pokemonId: "gliscor", pokemonName: "Gliscor", types: ["ground", "flying"], level: 29, moves: ["Earthquake", "Acrobatics", "Knock Off", "Swords Dance"] },
        { pokemonId: "dodrio", pokemonName: "Dodrio", types: ["normal", "flying"], level: 30, moves: ["Brave Bird", "Jump Kick", "Knock Off", "Swords Dance"] },
      ],
      difficult: [
        { pokemonId: "minior", pokemonName: "Minior", types: ["rock", "flying"], level: 29, moves: ["Stealth Rock", "Shell Smash", "Acrobatics", "Power Gem"] },
        { pokemonId: "skarmory", pokemonName: "Skarmory", types: ["steel", "flying"], level: 29, moves: ["Steel Wing", "Brave Bird", "Whirlwind", "Stealth Rock"] },
        { pokemonId: "gliscor", pokemonName: "Gliscor", types: ["ground", "flying"], level: 30, moves: ["Earthquake", "Acrobatics", "Knock Off", "Swords Dance"] },
        { pokemonId: "dodrio", pokemonName: "Dodrio", types: ["normal", "flying"], level: 31, moves: ["Brave Bird", "Jump Kick", "Knock Off", "Swords Dance"] },
      ],
      expert: [
        { pokemonId: "skarmory", pokemonName: "Skarmory", types: ["steel", "flying"], level: 30, moves: ["Steel Wing", "Brave Bird", "Whirlwind", "Stealth Rock"] },
        { pokemonId: "crobat", pokemonName: "Crobat", types: ["poison", "flying"], level: 30, moves: ["Brave Bird", "Cross Poison", "U-turn", "Roost"] },
        { pokemonId: "gliscor", pokemonName: "Gliscor", types: ["ground", "flying"], level: 31, moves: ["Earthquake", "Acrobatics", "Knock Off", "Swords Dance"] },
        { pokemonId: "dodrio", pokemonName: "Dodrio", types: ["normal", "flying"], level: 31, moves: ["Brave Bird", "Jump Kick", "Knock Off", "Swords Dance"] },
        { pokemonId: "pinsir", pokemonName: "Pinsir", types: ["bug"], level: 32, moves: ["X-Scissor", "Close Combat", "Quick Attack", "Swords Dance"], item: "Pinsirite" },
      ],
      insane: [
        { pokemonId: "skarmory", pokemonName: "Skarmory", types: ["steel", "flying"], level: 31, moves: ["Steel Wing", "Brave Bird", "Stealth Rock", "Whirlwind"], ability: "Sturdy" },
        { pokemonId: "dodrio", pokemonName: "Dodrio", types: ["normal", "flying"], level: 31, moves: ["Brave Bird", "Jump Kick", "Knock Off", "Swords Dance"], ability: "Early Bird" },
        { pokemonId: "crobat", pokemonName: "Crobat", types: ["poison", "flying"], level: 31, moves: ["Brave Bird", "Cross Poison", "U-turn", "Roost"], ability: "Infiltrator" },
        { pokemonId: "gliscor", pokemonName: "Gliscor", types: ["ground", "flying"], level: 32, moves: ["Earthquake", "Acrobatics", "Knock Off", "Swords Dance"], ability: "Poison Heal" },
        { pokemonId: "pinsir", pokemonName: "Pinsir", types: ["bug"], level: 32, moves: ["Storm Throw", "Close Combat", "Quick Attack", "Swords Dance"], ability: "Hyper Cutter", item: "Pinsirite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 4: Mel -- Normal (Inverse Battle) -- Fallshore City -- Level Cap 36
  // Gym gimmick: Inverse Battles (type effectiveness reversed)
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_4_mel",
    name: "Mel",
    title: "Gym Leader",
    locationId: "fallshore_city",
    specialtyType: "normal",
    milestoneRequired: "badge_3",
    badgeAwarded: "badge_4",
    teams: {
      vanilla: [
        { pokemonId: "swellow", pokemonName: "Swellow", types: ["normal", "flying"], level: 33, moves: ["Brave Bird", "Facade", "U-turn", "Quick Attack"] },
        { pokemonId: "type-null", pokemonName: "Type: Null", types: ["normal"], level: 33, moves: ["Crush Claw", "X-Scissor", "Iron Head", "Swords Dance"] },
        { pokemonId: "kangaskhan", pokemonName: "Kangaskhan", types: ["normal"], level: 34, moves: ["Return", "Sucker Punch", "Earthquake", "Power-Up Punch"] },
      ],
      difficult: [
        { pokemonId: "swellow", pokemonName: "Swellow", types: ["normal", "flying"], level: 34, moves: ["Brave Bird", "Facade", "U-turn", "Quick Attack"] },
        { pokemonId: "porygon-z", pokemonName: "Porygon-Z", types: ["normal"], level: 34, moves: ["Tri Attack", "Shadow Ball", "Thunderbolt", "Nasty Plot"] },
        { pokemonId: "type-null", pokemonName: "Type: Null", types: ["normal"], level: 34, moves: ["Crush Claw", "X-Scissor", "Iron Head", "Swords Dance"] },
        { pokemonId: "kangaskhan", pokemonName: "Kangaskhan", types: ["normal"], level: 35, moves: ["Return", "Sucker Punch", "Earthquake", "Power-Up Punch"] },
      ],
      expert: [
        { pokemonId: "swellow", pokemonName: "Swellow", types: ["normal", "flying"], level: 34, moves: ["Brave Bird", "Facade", "U-turn", "Quick Attack"], ability: "Guts" },
        { pokemonId: "porygon-z", pokemonName: "Porygon-Z", types: ["normal"], level: 35, moves: ["Tri Attack", "Shadow Ball", "Thunderbolt", "Nasty Plot"] },
        { pokemonId: "snorlax", pokemonName: "Snorlax", types: ["normal"], level: 35, moves: ["Body Slam", "Earthquake", "Curse", "Rest"] },
        { pokemonId: "type-null", pokemonName: "Type: Null", types: ["normal"], level: 35, moves: ["Crush Claw", "X-Scissor", "Iron Head", "Swords Dance"] },
        { pokemonId: "kangaskhan", pokemonName: "Kangaskhan", types: ["normal"], level: 36, moves: ["Return", "Sucker Punch", "Earthquake", "Power-Up Punch"], item: "Kangaskhanite" },
      ],
      insane: [
        { pokemonId: "porygon-z", pokemonName: "Porygon-Z", types: ["normal"], level: 35, moves: ["Uproar", "Tri Attack", "Uproar", "Tri Attack"], ability: "Adaptability" },
        { pokemonId: "swellow", pokemonName: "Swellow", types: ["normal", "flying"], level: 35, moves: ["Brave Bird", "Facade", "U-turn", "Quick Attack"], ability: "Guts" },
        { pokemonId: "snorlax", pokemonName: "Snorlax", types: ["normal"], level: 35, moves: ["Body Slam", "Earthquake", "Curse", "Rest"], ability: "Thick Fat" },
        { pokemonId: "type-null", pokemonName: "Type: Null", types: ["normal"], level: 36, moves: ["Crush Claw", "X-Scissor", "Iron Head", "Swords Dance"], ability: "Battle Armor" },
        { pokemonId: "kangaskhan", pokemonName: "Kangaskhan", types: ["normal"], level: 36, moves: ["Return", "Sucker Punch", "Earthquake", "Power-Up Punch"], ability: "Scrappy", item: "Kangaskhanite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 5: Galavan -- Electric/Steel -- Dehara City -- Level Cap 45
  // Gym gimmick: Electric/Steel types levitate (immune to Ground); Insane: Electric Terrain
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_5_galavan",
    name: "Galavan",
    title: "Gym Leader",
    locationId: "dehara_city",
    specialtyType: "electric",
    milestoneRequired: "badge_4",
    badgeAwarded: "badge_5",
    teams: {
      vanilla: [
        { pokemonId: "magnezone", pokemonName: "Magnezone", types: ["electric", "steel"], level: 41, moves: ["Thunderbolt", "Flash Cannon", "Volt Switch", "Magnet Rise"] },
        { pokemonId: "vikavolt", pokemonName: "Vikavolt", types: ["bug", "electric"], level: 41, moves: ["Thunderbolt", "Bug Buzz", "Energy Ball", "Volt Switch"] },
        { pokemonId: "electivire", pokemonName: "Electivire", types: ["electric"], level: 42, moves: ["Wild Charge", "Ice Punch", "Cross Chop", "Earthquake"] },
      ],
      difficult: [
        { pokemonId: "magnezone", pokemonName: "Magnezone", types: ["electric", "steel"], level: 42, moves: ["Thunderbolt", "Flash Cannon", "Volt Switch", "Magnet Rise"] },
        { pokemonId: "vikavolt", pokemonName: "Vikavolt", types: ["bug", "electric"], level: 42, moves: ["Thunderbolt", "Bug Buzz", "Energy Ball", "Volt Switch"] },
        { pokemonId: "toxtricity", pokemonName: "Toxtricity", types: ["electric", "poison"], level: 43, moves: ["Overdrive", "Sludge Wave", "Boomburst", "Shift Gear"] },
        { pokemonId: "electivire", pokemonName: "Electivire", types: ["electric"], level: 43, moves: ["Wild Charge", "Ice Punch", "Cross Chop", "Earthquake"] },
      ],
      expert: [
        { pokemonId: "magnezone", pokemonName: "Magnezone", types: ["electric", "steel"], level: 43, moves: ["Thunderbolt", "Flash Cannon", "Body Press", "Volt Switch"] },
        { pokemonId: "vikavolt", pokemonName: "Vikavolt", types: ["bug", "electric"], level: 43, moves: ["Thunderbolt", "Bug Buzz", "Energy Ball", "Volt Switch"] },
        { pokemonId: "toxtricity", pokemonName: "Toxtricity", types: ["electric", "poison"], level: 44, moves: ["Overdrive", "Sludge Wave", "Boomburst", "Shift Gear"] },
        { pokemonId: "rotom-wash", pokemonName: "Rotom-Wash", types: ["electric", "water"], level: 44, moves: ["Hydro Pump", "Thunderbolt", "Volt Switch", "Will-O-Wisp"] },
        { pokemonId: "electivire", pokemonName: "Electivire", types: ["electric"], level: 45, moves: ["Wild Charge", "Ice Punch", "Cross Chop", "Earthquake"] },
      ],
      insane: [
        { pokemonId: "magnezone", pokemonName: "Magnezone", types: ["electric", "steel"], level: 44, moves: ["Thunderbolt", "Flash Cannon", "Body Press", "Volt Switch"], ability: "Magnet Pull" },
        { pokemonId: "vikavolt", pokemonName: "Vikavolt", types: ["bug", "electric"], level: 44, moves: ["Thunderbolt", "Bug Buzz", "Energy Ball", "Volt Switch"], ability: "Levitate" },
        { pokemonId: "toxtricity", pokemonName: "Toxtricity", types: ["electric", "poison"], level: 44, moves: ["Overdrive", "Sludge Wave", "Boomburst", "Shift Gear"], ability: "Punk Rock" },
        { pokemonId: "heatran", pokemonName: "Heatran", types: ["fire", "steel"], level: 45, moves: ["Magma Storm", "Flash Cannon", "Frost Breath", "Earth Power"], ability: "Flash Fire" },
        { pokemonId: "electivire", pokemonName: "Electivire", types: ["electric"], level: 45, moves: ["Wild Charge", "Ice Punch", "Cross Chop", "Earthquake"], ability: "Motor Drive" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 6: Big Mo -- Fighting -- Antisis City -- Level Cap 52
  // Gym gimmick: Ring Challenge (3 consecutive fights); Flying/Psychic/Fairy moves disabled
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_6_big_mo",
    name: "Big Mo",
    title: "Gym Leader",
    locationId: "antisis_city",
    specialtyType: "fighting",
    milestoneRequired: "badge_5",
    badgeAwarded: "badge_6",
    teams: {
      vanilla: [
        { pokemonId: "mienshao", pokemonName: "Mienshao", types: ["fighting"], level: 48, moves: ["Aura Sphere", "Drain Punch", "U-turn", "Knock Off"] },
        { pokemonId: "hariyama", pokemonName: "Hariyama", types: ["fighting"], level: 49, moves: ["Close Combat", "Knock Off", "Bullet Punch", "Belly Drum"] },
        { pokemonId: "lucario", pokemonName: "Lucario", types: ["fighting", "steel"], level: 50, moves: ["Close Combat", "Meteor Mash", "Extreme Speed", "Swords Dance"] },
      ],
      difficult: [
        { pokemonId: "mienshao", pokemonName: "Mienshao", types: ["fighting"], level: 49, moves: ["Aura Sphere", "Drain Punch", "U-turn", "Knock Off"] },
        { pokemonId: "pangoro", pokemonName: "Pangoro", types: ["fighting", "dark"], level: 49, moves: ["Drain Punch", "Knock Off", "Iron Head", "Bulk Up"] },
        { pokemonId: "hariyama", pokemonName: "Hariyama", types: ["fighting"], level: 50, moves: ["Close Combat", "Knock Off", "Bullet Punch", "Belly Drum"] },
        { pokemonId: "lucario", pokemonName: "Lucario", types: ["fighting", "steel"], level: 51, moves: ["Close Combat", "Meteor Mash", "Extreme Speed", "Swords Dance"], item: "Lucarionite" },
      ],
      expert: [
        { pokemonId: "mienshao", pokemonName: "Mienshao", types: ["fighting"], level: 50, moves: ["Aura Sphere", "Drain Punch", "U-turn", "Knock Off"] },
        { pokemonId: "pangoro", pokemonName: "Pangoro", types: ["fighting", "dark"], level: 50, moves: ["Drain Punch", "Knock Off", "Iron Head", "Bulk Up"] },
        { pokemonId: "hariyama", pokemonName: "Hariyama", types: ["fighting"], level: 51, moves: ["Close Combat", "Knock Off", "Bullet Punch", "Belly Drum"] },
        { pokemonId: "guzzlord", pokemonName: "Guzzlord", types: ["dark", "dragon"], level: 51, moves: ["Draco Meteor", "Dark Pulse", "Flamethrower", "Sludge Wave"] },
        { pokemonId: "lucario", pokemonName: "Lucario", types: ["fighting", "steel"], level: 52, moves: ["Close Combat", "Meteor Mash", "Extreme Speed", "Swords Dance"], item: "Lucarionite" },
      ],
      insane: [
        { pokemonId: "mienshao", pokemonName: "Mienshao", types: ["fighting"], level: 51, moves: ["Aura Sphere", "Drain Punch", "U-turn", "Knock Off"], ability: "Reckless" },
        { pokemonId: "pangoro", pokemonName: "Pangoro", types: ["fighting", "dark"], level: 51, moves: ["Drain Punch", "Knock Off", "Iron Head", "Bulk Up"], ability: "Iron Fist" },
        { pokemonId: "hariyama", pokemonName: "Hariyama", types: ["fighting"], level: 51, moves: ["Close Combat", "Knock Off", "Bullet Punch", "Belly Drum"], ability: "Guts" },
        { pokemonId: "guzzlord", pokemonName: "Guzzlord", types: ["dark", "dragon"], level: 52, moves: ["Draco Meteor", "Dark Pulse", "Flamethrower", "Sludge Wave"], ability: "Beast Boost" },
        { pokemonId: "lucario", pokemonName: "Lucario", types: ["fighting", "steel"], level: 52, moves: ["Close Combat", "Meteor Mash", "Extreme Speed", "Swords Dance"], ability: "Adaptability", item: "Lucarionite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 7: Tessy -- Water -- Polder Town -- Level Cap 57
  // Gym gimmick: Pokemon become the type of their first two moves; Rain active
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_7_tessy",
    name: "Tessy",
    title: "Gym Leader",
    locationId: "polder_town",
    specialtyType: "water",
    milestoneRequired: "badge_6",
    badgeAwarded: "badge_7",
    teams: {
      vanilla: [
        { pokemonId: "toxapex", pokemonName: "Toxapex", types: ["poison", "water"], level: 53, moves: ["Scald", "Toxic Spikes", "Recover", "Haze"] },
        { pokemonId: "seaking", pokemonName: "Seaking", types: ["water"], level: 54, moves: ["Waterfall", "Megahorn", "Drill Run", "Aqua Jet"] },
        { pokemonId: "gyarados", pokemonName: "Gyarados", types: ["water", "flying"], level: 55, moves: ["Waterfall", "Crunch", "Ice Fang", "Dragon Dance"], item: "Gyaradosite" },
      ],
      difficult: [
        { pokemonId: "toxapex", pokemonName: "Toxapex", types: ["poison", "water"], level: 54, moves: ["Scald", "Toxic Spikes", "Recover", "Haze"] },
        { pokemonId: "seaking", pokemonName: "Seaking", types: ["water"], level: 54, moves: ["Waterfall", "Megahorn", "Drill Run", "Aqua Jet"] },
        { pokemonId: "zeraora", pokemonName: "Zeraora", types: ["electric"], level: 55, moves: ["Plasma Fists", "Close Combat", "Knock Off", "Volt Switch"] },
        { pokemonId: "gyarados", pokemonName: "Gyarados", types: ["water", "flying"], level: 56, moves: ["Waterfall", "Crunch", "Ice Fang", "Dragon Dance"], item: "Gyaradosite" },
      ],
      expert: [
        { pokemonId: "toxapex", pokemonName: "Toxapex", types: ["poison", "water"], level: 55, moves: ["Scald", "Toxic Spikes", "Recover", "Haze"] },
        { pokemonId: "seaking", pokemonName: "Seaking", types: ["water"], level: 55, moves: ["Waterfall", "Megahorn", "Drill Run", "Aqua Jet"] },
        { pokemonId: "zeraora", pokemonName: "Zeraora", types: ["electric"], level: 56, moves: ["Plasma Fists", "Close Combat", "Knock Off", "Volt Switch"] },
        { pokemonId: "milotic", pokemonName: "Milotic", types: ["water"], level: 56, moves: ["Scald", "Ice Beam", "Recover", "Coil"] },
        { pokemonId: "gyarados", pokemonName: "Gyarados", types: ["water", "flying"], level: 57, moves: ["Waterfall", "Crunch", "Ice Fang", "Dragon Dance"], item: "Gyaradosite" },
      ],
      insane: [
        { pokemonId: "toxapex", pokemonName: "Toxapex", types: ["poison", "water"], level: 56, moves: ["Scald", "Toxic Spikes", "Recover", "Haze"], ability: "Regenerator" },
        { pokemonId: "seaking", pokemonName: "Seaking", types: ["water"], level: 56, moves: ["Waterfall", "Megahorn", "Aqua Jet", "Drill Run"], ability: "Lightning Rod" },
        { pokemonId: "zeraora", pokemonName: "Zeraora", types: ["electric"], level: 56, moves: ["Plasma Fists", "Close Combat", "Roar", "Volt Switch"], ability: "Volt Absorb" },
        { pokemonId: "milotic", pokemonName: "Milotic", types: ["water"], level: 57, moves: ["Scald", "Ice Beam", "Recover", "Coil"], ability: "Marvel Scale" },
        { pokemonId: "gyarados", pokemonName: "Gyarados", types: ["water", "flying"], level: 57, moves: ["Waterfall", "Crunch", "Ice Fang", "Dragon Dance"], ability: "Intimidate", item: "Gyaradosite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Gym 8: Benjamin -- Bug -- Redwood Village -- Level Cap 61
  // Gym gimmick: Fainted Pokemon devolve to previous evolutionary stage
  // ───────────────────────────────────────────────────────────
  {
    id: "gym_8_benjamin",
    name: "Benjamin",
    title: "Gym Leader",
    locationId: "redwood_village",
    specialtyType: "bug",
    milestoneRequired: "badge_7",
    badgeAwarded: "badge_8",
    teams: {
      vanilla: [
        { pokemonId: "volcarona", pokemonName: "Volcarona", types: ["bug", "fire"], level: 58, moves: ["Fire Blast", "Bug Buzz", "Quiver Dance", "Giga Drain"] },
        { pokemonId: "drapion", pokemonName: "Drapion", types: ["poison", "dark"], level: 58, moves: ["Cross Poison", "Knock Off", "Earthquake", "Swords Dance"] },
        { pokemonId: "scizor", pokemonName: "Scizor", types: ["bug", "steel"], level: 59, moves: ["Bullet Punch", "U-turn", "Superpower", "Swords Dance"], item: "Scizorite" },
      ],
      difficult: [
        { pokemonId: "volcarona", pokemonName: "Volcarona", types: ["bug", "fire"], level: 58, moves: ["Fire Blast", "Bug Buzz", "Quiver Dance", "Giga Drain"] },
        { pokemonId: "flygon", pokemonName: "Flygon", types: ["ground", "dragon"], level: 59, moves: ["Earthquake", "Dragon Claw", "U-turn", "Dragon Dance"] },
        { pokemonId: "drapion", pokemonName: "Drapion", types: ["poison", "dark"], level: 59, moves: ["Cross Poison", "Knock Off", "Earthquake", "Swords Dance"] },
        { pokemonId: "scizor", pokemonName: "Scizor", types: ["bug", "steel"], level: 60, moves: ["Bullet Punch", "U-turn", "Superpower", "Swords Dance"], item: "Scizorite" },
      ],
      expert: [
        { pokemonId: "volcarona", pokemonName: "Volcarona", types: ["bug", "fire"], level: 59, moves: ["Fire Blast", "Bug Buzz", "Quiver Dance", "Giga Drain"] },
        { pokemonId: "flygon", pokemonName: "Flygon", types: ["ground", "dragon"], level: 59, moves: ["Earthquake", "Dragon Claw", "U-turn", "Dragon Dance"] },
        { pokemonId: "drapion", pokemonName: "Drapion", types: ["poison", "dark"], level: 60, moves: ["Cross Poison", "Knock Off", "Earthquake", "Swords Dance"] },
        { pokemonId: "heracross", pokemonName: "Heracross", types: ["bug", "fighting"], level: 60, moves: ["Megahorn", "Close Combat", "Knock Off", "Swords Dance"] },
        { pokemonId: "scizor", pokemonName: "Scizor", types: ["bug", "steel"], level: 61, moves: ["Bullet Punch", "U-turn", "Superpower", "Swords Dance"], item: "Scizorite" },
      ],
      insane: [
        { pokemonId: "volcarona", pokemonName: "Volcarona", types: ["bug", "fire"], level: 60, moves: ["Fire Blast", "Bug Buzz", "Quiver Dance", "Giga Drain"], ability: "Flame Body" },
        { pokemonId: "flygon", pokemonName: "Flygon", types: ["ground", "dragon"], level: 60, moves: ["Earthquake", "Dragon Claw", "U-turn", "Dragon Dance"], ability: "Levitate" },
        { pokemonId: "drapion", pokemonName: "Drapion", types: ["poison", "dark"], level: 60, moves: ["Cross Poison", "Knock Off", "Earthquake", "Swords Dance"], ability: "Battle Armor" },
        { pokemonId: "heracross", pokemonName: "Heracross", types: ["bug", "fighting"], level: 61, moves: ["Megahorn", "Close Combat", "Knock Off", "Swords Dance"], ability: "Moxie" },
        { pokemonId: "scizor", pokemonName: "Scizor", types: ["bug", "steel"], level: 61, moves: ["Bullet Punch", "U-turn", "Superpower", "Swords Dance"], ability: "Technician", item: "Scizorite" },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Elite Four
  // ───────────────────────────────────────────────────────────
  {
    id: "elite_four_1",
    name: "Moleman",
    title: "Elite Four",
    locationId: "pokemon_league",
    specialtyType: "ground",
    milestoneRequired: "badge_8",
    teams: {
      expert: [
        { pokemonId: "metagross", pokemonName: "Metagross", types: ["steel", "psychic"], level: 70, moves: ["Meteor Mash", "Zen Headbutt", "Earthquake", "Bullet Punch"] },
        { pokemonId: "scizor", pokemonName: "Scizor", types: ["bug", "steel"], level: 70, moves: ["Bullet Punch", "U-turn", "Superpower", "Swords Dance"] },
        { pokemonId: "aegislash", pokemonName: "Aegislash", types: ["steel", "ghost"], level: 70, moves: ["Shadow Ball", "Flash Cannon", "King's Shield", "Shadow Sneak"] },
        { pokemonId: "excadrill", pokemonName: "Excadrill", types: ["ground", "steel"], level: 71, moves: ["Earthquake", "Iron Head", "Rock Slide", "Swords Dance"] },
      ],
    },
  },
  {
    id: "elite_four_2",
    name: "Elias",
    title: "Elite Four",
    locationId: "pokemon_league",
    specialtyType: "ghost",
    milestoneRequired: "badge_8",
    teams: {
      expert: [
        { pokemonId: "togekiss", pokemonName: "Togekiss", types: ["fairy", "flying"], level: 70, moves: ["Dazzling Gleam", "Air Slash", "Nasty Plot", "Roost"] },
        { pokemonId: "gardevoir", pokemonName: "Gardevoir", types: ["psychic", "fairy"], level: 70, moves: ["Moonblast", "Psychic", "Focus Blast", "Calm Mind"] },
        { pokemonId: "hatterene", pokemonName: "Hatterene", types: ["psychic", "fairy"], level: 70, moves: ["Dazzling Gleam", "Psychic", "Mystical Fire", "Trick Room"] },
        { pokemonId: "primarina", pokemonName: "Primarina", types: ["water", "fairy"], level: 71, moves: ["Moonblast", "Sparkling Aria", "Energy Ball", "Calm Mind"] },
      ],
    },
  },
  {
    id: "elite_four_3",
    name: "Arabella",
    title: "Elite Four",
    locationId: "pokemon_league",
    specialtyType: "fairy",
    milestoneRequired: "badge_8",
    teams: {
      expert: [
        { pokemonId: "dragapult", pokemonName: "Dragapult", types: ["dragon", "ghost"], level: 71, moves: ["Dragon Darts", "Shadow Ball", "Thunderbolt", "U-turn"] },
        { pokemonId: "salamence", pokemonName: "Salamence", types: ["dragon", "flying"], level: 71, moves: ["Outrage", "Earthquake", "Dragon Dance", "Fire Fang"] },
        { pokemonId: "kommo-o", pokemonName: "Kommo-o", types: ["dragon", "fighting"], level: 71, moves: ["Clanging Scales", "Close Combat", "Poison Jab", "Dragon Dance"] },
        { pokemonId: "dragonite", pokemonName: "Dragonite", types: ["dragon", "flying"], level: 72, moves: ["Dragon Claw", "Extreme Speed", "Earthquake", "Dragon Dance"] },
      ],
    },
  },
  {
    id: "elite_four_4",
    name: "Penny",
    title: "Elite Four",
    locationId: "pokemon_league",
    specialtyType: "normal",
    milestoneRequired: "badge_8",
    teams: {
      expert: [
        { pokemonId: "gengar", pokemonName: "Gengar", types: ["ghost", "poison"], level: 71, moves: ["Shadow Ball", "Sludge Wave", "Focus Blast", "Nasty Plot"] },
        { pokemonId: "chandelure", pokemonName: "Chandelure", types: ["ghost", "fire"], level: 71, moves: ["Shadow Ball", "Fire Blast", "Energy Ball", "Trick"] },
        { pokemonId: "mimikyu", pokemonName: "Mimikyu", types: ["ghost", "fairy"], level: 71, moves: ["Shadow Claw", "Play Rough", "Shadow Sneak", "Swords Dance"] },
        { pokemonId: "dusknoir", pokemonName: "Dusknoir", types: ["ghost"], level: 72, moves: ["Shadow Punch", "Ice Punch", "Earthquake", "Trick Room"] },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────
  // Champion
  // ───────────────────────────────────────────────────────────
  {
    id: "champion",
    name: "Jax",
    title: "Champion",
    locationId: "pokemon_league",
    specialtyType: "normal",
    milestoneRequired: "elite_four",
    teams: {
      expert: [
        { pokemonId: "garchomp", pokemonName: "Garchomp", types: ["dragon", "ground"], level: 73, moves: ["Earthquake", "Dragon Claw", "Stone Edge", "Swords Dance"] },
        { pokemonId: "volcarona", pokemonName: "Volcarona", types: ["bug", "fire"], level: 73, moves: ["Fire Blast", "Bug Buzz", "Quiver Dance", "Giga Drain"] },
        { pokemonId: "toxapex", pokemonName: "Toxapex", types: ["poison", "water"], level: 73, moves: ["Scald", "Toxic", "Recover", "Haze"] },
        { pokemonId: "ferrothorn", pokemonName: "Ferrothorn", types: ["grass", "steel"], level: 73, moves: ["Power Whip", "Gyro Ball", "Leech Seed", "Stealth Rock"] },
        { pokemonId: "aegislash", pokemonName: "Aegislash", types: ["steel", "ghost"], level: 74, moves: ["Shadow Ball", "Flash Cannon", "King's Shield", "Shadow Sneak"] },
        { pokemonId: "greninja", pokemonName: "Greninja", types: ["water", "dark"], level: 75, moves: ["Hydro Pump", "Dark Pulse", "Ice Beam", "U-turn"] },
      ],
    },
  },
];

export async function scrapeTrainers(): Promise<void> {
  console.log("[trainers] Building trainer data...");
  console.log(`[trainers] Total trainers: ${trainers.length}`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(trainers, null, 2), "utf-8");
  console.log(`[trainers] Wrote ${trainers.length} trainers to ${OUTPUT_FILE}`);

  // Print summary
  console.log("\n[trainers] Roster:");
  for (const t of trainers) {
    const teamKeys = Object.keys(t.teams) as (keyof typeof t.teams)[];
    const expertTeam = t.teams.expert ?? t.teams[teamKeys[0]!] ?? [];
    const teamSize = expertTeam.length;
    const levels = expertTeam.map((p) => p.level);
    const levelRange = levels.length > 0 ? `Lv ${Math.min(...levels)}-${Math.max(...levels)}` : "N/A";
    console.log(
      `  ${t.badgeAwarded ?? t.id}: ${t.name} (${t.specialtyType}) @ ${t.locationId} -- ${teamSize} Pokemon, ${levelRange}`
    );
  }
}

// Allow direct execution
if (require.main === module) {
  scrapeTrainers().catch((err) => {
    console.error("[trainers] Fatal error:", err);
    process.exit(1);
  });
}
