/**
 * Location Scraper for Pokemon Unbound Companion
 *
 * Fetches encounter data from the Unbound Pokedex repository and transforms
 * it into a structured location format with encounter details.
 *
 * Data source: ydarissep/Unbound-Pokedex encounters.json
 * Output: data/locations.json
 *
 * Run: npx tsx scripts/scrapers/locations.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawSlot {
  species: string;
  minLevel: number;
  maxLevel: number;
}

interface RawEncounterMethod {
  encounterRate: number;
  slots: RawSlot[];
}

interface RawEncounters {
  grassAnytime?: RawEncounterMethod;
  grassDay?: RawEncounterMethod;
  grassNight?: RawEncounterMethod;
  water?: RawEncounterMethod;
  fishing?: RawEncounterMethod;
  rockSmash?: RawEncounterMethod;
  honeyTree?: RawEncounterMethod;
  hidden?: RawEncounterMethod;
  [key: string]: RawEncounterMethod | undefined;
}

interface RawLocation {
  mapGroup: number;
  mapNum: number;
  mapName: string;
  encounters: RawEncounters;
}

interface Encounter {
  pokemonId: string;
  pokemonName: string;
  types: string[];
  method: string;
  rate: number;
  levels: { min: number; max: number };
}

interface Location {
  id: string;
  name: string;
  category: "town" | "route" | "dungeon" | "building" | "special";
  encounters: Encounter[];
  items: never[];
  trainers: never[];
  milestoneRequired: string;
  connectedLocations: never[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENCOUNTERS_URL =
  "https://raw.githubusercontent.com/ydarissep/Unbound-Pokedex/main/src/locations/encounters.json";

const OUTPUT_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "locations.json");

/**
 * Maps raw encounter keys to human-readable method strings.
 */
const METHOD_MAP: Record<string, string> = {
  grassAnytime: "grass",
  grassDay: "grass-day",
  grassNight: "grass-night",
  water: "surf",
  fishing: "fishing",
  rockSmash: "rock-smash",
  honeyTree: "honey-tree",
  hidden: "hidden",
};

// ---------------------------------------------------------------------------
// Transformation helpers
// ---------------------------------------------------------------------------

/**
 * Convert a raw map name like "FLOWER_PARADISE_A" into a lowercase id
 * with underscores: "flower_paradise_a".
 */
function toLocationId(mapName: string): string {
  return mapName.toLowerCase();
}

/**
 * Convert a raw map name like "FLOWER_PARADISE_A" into a display name:
 * "Flower Paradise A".
 */
function toLocationName(mapName: string): string {
  return mapName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Guess a location category based on keywords in the map name.
 */
function guessCategory(
  mapName: string
): "town" | "route" | "dungeon" | "building" | "special" {
  const upper = mapName.toUpperCase();
  if (upper.includes("ROUTE")) return "route";
  if (
    upper.includes("TOWN") ||
    upper.includes("CITY") ||
    upper.includes("VILLAGE")
  )
    return "town";
  if (
    upper.includes("CAVE") ||
    upper.includes("TUNNEL") ||
    upper.includes("FOREST") ||
    upper.includes("MINE") ||
    upper.includes("CRYPT") ||
    upper.includes("RUINS") ||
    upper.includes("MOUNTAIN") ||
    upper.includes("MT_")
  )
    return "dungeon";
  return "special";
}

/**
 * Convert a species constant like "SPECIES_FLABEBE_ORANGE" into
 * { pokemonId: "flabebe_orange", pokemonName: "Flabebe Orange" }.
 */
function parseSpecies(species: string): { id: string; name: string } {
  // Strip the "SPECIES_" prefix
  const raw = species.replace(/^SPECIES_/, "");
  const id = raw.toLowerCase();
  const name = raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return { id, name };
}

/**
 * Process slots for a given encounter method. Duplicate species are merged
 * by summing their rates and using the widest level range.
 *
 * Each slot gets an equal share: 100 / totalSlots percent.
 */
function processSlots(
  slots: RawSlot[],
  methodKey: string
): Encounter[] {
  const method = METHOD_MAP[methodKey] ?? methodKey;
  const totalSlots = slots.length;
  if (totalSlots === 0) return [];

  const ratePerSlot = 100 / totalSlots;

  // Aggregate by species
  const aggregated = new Map<
    string,
    {
      pokemonId: string;
      pokemonName: string;
      rate: number;
      minLevel: number;
      maxLevel: number;
    }
  >();

  for (const slot of slots) {
    const { id, name } = parseSpecies(slot.species);
    const existing = aggregated.get(id);
    if (existing) {
      existing.rate += ratePerSlot;
      existing.minLevel = Math.min(existing.minLevel, slot.minLevel);
      existing.maxLevel = Math.max(existing.maxLevel, slot.maxLevel);
    } else {
      aggregated.set(id, {
        pokemonId: id,
        pokemonName: name,
        rate: ratePerSlot,
        minLevel: slot.minLevel,
        maxLevel: slot.maxLevel,
      });
    }
  }

  return Array.from(aggregated.values()).map((entry) => ({
    pokemonId: entry.pokemonId,
    pokemonName: entry.pokemonName,
    types: [], // will be enriched later
    method,
    rate: Math.round(entry.rate * 100) / 100, // round to 2 decimal places
    levels: { min: entry.minLevel, max: entry.maxLevel },
  }));
}

/**
 * Transform a single raw location entry into the output Location format.
 */
function transformLocation(raw: RawLocation): Location {
  const encounters: Encounter[] = [];

  for (const [key, methodData] of Object.entries(raw.encounters)) {
    if (!methodData || !methodData.slots || methodData.slots.length === 0) {
      continue;
    }
    encounters.push(...processSlots(methodData.slots, key));
  }

  return {
    id: toLocationId(raw.mapName),
    name: toLocationName(raw.mapName),
    category: guessCategory(raw.mapName),
    encounters,
    items: [],
    trainers: [],
    milestoneRequired: "game_start",
    connectedLocations: [],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[locations] Fetching encounters data...");

  const response = await fetch(ENCOUNTERS_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch encounters.json: ${response.status} ${response.statusText}`
    );
  }

  const rawData: RawLocation[] = await response.json();
  console.log(`[locations] Received ${rawData.length} raw location entries.`);

  const locations = rawData.map(transformLocation);

  // Sort locations alphabetically by id for stable output
  locations.sort((a, b) => a.id.localeCompare(b.id));

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  await writeFile(OUTPUT_FILE, JSON.stringify(locations, null, 2), "utf-8");

  console.log(`[locations] Wrote ${locations.length} locations to ${OUTPUT_FILE}`);

  // Print a sample entry for verification
  const sample = locations.find((l) => l.encounters.length > 0) ?? locations[0];
  if (sample) {
    console.log("\n[locations] Sample output:");
    console.log(JSON.stringify(sample, null, 2));
  }

  // Summary stats
  const totalEncounters = locations.reduce(
    (sum, l) => sum + l.encounters.length,
    0
  );
  const categories = locations.reduce(
    (acc, l) => {
      acc[l.category] = (acc[l.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`\n[locations] Summary:`);
  console.log(`  Total locations: ${locations.length}`);
  console.log(`  Total unique encounters: ${totalEncounters}`);
  console.log(`  Categories: ${JSON.stringify(categories)}`);
}

main().catch((err) => {
  console.error("[locations] Fatal error:", err);
  process.exit(1);
});
