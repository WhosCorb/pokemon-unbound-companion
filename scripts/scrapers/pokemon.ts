/**
 * Pokemon Scraper for Pokemon Unbound Companion
 *
 * Fetches Pokemon data from multiple sources and outputs a unified JSON file.
 *
 * Data sources:
 * 1. Borrius Pokedex Scraper (primary data: stats, moves, abilities, evolutions)
 * 2. Unbound encounters.json (catch locations per map)
 * 3. Complete Fire Red Upgrade species.h (species ID mapping -- reserved for future use)
 * 4. Dynamic Pokemon Expansion Base_Stats.c (base stats -- reserved for future use)
 *
 * Run with: npx tsx scripts/scrapers/pokemon.ts
 *
 * Types referenced from: ../../src/lib/types
 * (Pokemon, PokemonType, BaseStats, LearnsetMove, EvolutionStage, Ability, CatchLocation)
 */

import { writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";

// ---------------------------------------------------------------------------
// Source URLs
// ---------------------------------------------------------------------------

const BORRIUS_POKEDEX_URL =
  "https://raw.githubusercontent.com/nMckenryan/Borrius-Pokedex-Scraper/main/scraperData/borrius_pokedex_data.json";

const ENCOUNTERS_URL =
  "https://raw.githubusercontent.com/ydarissep/Unbound-Pokedex/main/src/locations/encounters.json";

// ---------------------------------------------------------------------------
// Source data interfaces (what the remote JSON looks like)
// ---------------------------------------------------------------------------

interface BorriusStat {
  base_stat: number;
}

interface BorriusAbility {
  ability_name: string;
  slot: number;
}

interface BorriusEvolution {
  stage: number;
  evo_name: string;
  evo_trigger: string;
  evo_conditions: (number | string)[];
}

interface BorriusMove {
  name: string;
  type: string;
  category: string;
  power: string;
  accuracy: string;
  pp?: string;
  level_learned_at: string;
  method: string;
}

interface BorriusPokemon {
  id: number;
  national_id: number;
  name: string;
  types: string[];
  abilities: BorriusAbility[];
  stats: {
    hp: BorriusStat;
    attack: BorriusStat;
    defense: BorriusStat;
    specialAttack: BorriusStat;
    specialDefense: BorriusStat;
    speed: BorriusStat;
  };
  evolution_chain: BorriusEvolution[];
  moves: BorriusMove[];
}

// Encounter data structures from Unbound Pokedex
// The top-level keys are map names (e.g. "FLOWER_PARADISE_A").
// Each map contains encounter method groups (e.g. "land_mons", "water_mons", etc.)
// which have an "encounter_rate" and a "mons" array.
interface EncounterMon {
  min_level: number;
  max_level: number;
  species: string; // e.g. "SPECIES_LARVITAR"
  encounter_rate?: number;
}

interface EncounterMethodGroup {
  encounter_rate: number;
  mons: EncounterMon[];
}

type EncounterMap = Record<string, EncounterMethodGroup>;
type EncountersData = Record<string, EncounterMap>;

// ---------------------------------------------------------------------------
// Output interfaces (mirrors src/lib/types.ts)
// ---------------------------------------------------------------------------

type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

type EncounterMethod =
  | "grass" | "surf" | "fishing-old" | "fishing-good" | "fishing-super"
  | "headbutt" | "rock-smash" | "gift" | "trade" | "static" | "raid";

interface OutputPokemon {
  id: string;
  dexNumber: number;
  name: string;
  types: PokemonType[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  abilities: { name: string; isHidden: boolean }[];
  learnset: {
    name: string;
    type: PokemonType;
    category: "physical" | "special" | "status";
    power: number | null;
    accuracy: number | null;
    pp: number;
    source: "level-up" | "tm" | "tutor" | "egg";
    level?: number;
    tmNumber?: string;
  }[];
  evolutionChain: { pokemonId: string; pokemonName: string; method: string }[];
  catchLocations: {
    locationId: string;
    locationName: string;
    method: EncounterMethod;
    rate: number;
    milestoneRequired: string;
  }[];
  milestoneRequired: string;
  spriteUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capitalize the first letter of a string. */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert an all-caps constant name to title case with spaces.
 *  e.g. "FLOWER_PARADISE_A" -> "Flower Paradise A"
 */
function mapNameToReadable(raw: string): string {
  return raw
    .split("_")
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

/** Convert a map constant name to a kebab-case location ID.
 *  e.g. "FLOWER_PARADISE_A" -> "flower-paradise-a"
 */
function mapNameToId(raw: string): string {
  return raw.toLowerCase().replace(/_/g, "-");
}

/** Convert a SPECIES_XYZ identifier to our lowercase Pokemon ID.
 *  e.g. "SPECIES_LARVITAR" -> "larvitar"
 */
function speciesNameToId(species: string): string {
  return species.replace(/^SPECIES_/, "").toLowerCase().replace(/_/g, "-");
}

/** Validate and lowercase a type string. Returns the type or "normal" as fallback. */
function normalizeType(raw: string): PokemonType {
  const lower = raw.toLowerCase() as PokemonType;
  const validTypes: Set<string> = new Set([
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy",
  ]);
  return validTypes.has(lower) ? lower : "normal";
}

/** Normalize move category to our schema. */
function normalizeCategory(raw: string): "physical" | "special" | "status" {
  const lower = raw.toLowerCase();
  if (lower === "physical") return "physical";
  if (lower === "special") return "special";
  return "status";
}

/** Parse a numeric string, returning null for "-" or non-numeric values. */
function parseStatOrNull(val: string): number | null {
  if (!val || val === "-" || val === "" || val === "null") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Map encounter method group keys to our EncounterMethod type. */
function mapEncounterMethod(groupKey: string): EncounterMethod {
  const mapping: Record<string, EncounterMethod> = {
    land_mons: "grass",
    water_mons: "surf",
    rock_smash_mons: "rock-smash",
    fishing_mons: "fishing-old",
    old_rod_mons: "fishing-old",
    good_rod_mons: "fishing-good",
    super_rod_mons: "fishing-super",
    hidden_mons: "grass",
    headbutt_mons: "headbutt",
    raid_mons: "raid",
  };
  return mapping[groupKey] ?? "grass";
}

/** Determine move source from raw method string. */
function normalizeMoveSource(raw: string): "level-up" | "tm" | "tutor" | "egg" {
  const lower = raw.toLowerCase();
  if (lower === "level-up" || lower === "level up") return "level-up";
  if (lower === "tm" || lower === "machine" || lower.startsWith("tm")) return "tm";
  if (lower === "tutor" || lower === "move-tutor") return "tutor";
  if (lower === "egg" || lower === "breeding") return "egg";
  return "level-up";
}

/** Build an evolution method description string from trigger and conditions. */
function buildEvolutionMethod(
  trigger: string,
  conditions: (number | string)[]
): string {
  if (trigger === "base") return "Base";

  if (trigger === "level-up" || trigger === "level_up") {
    if (conditions.length > 0 && typeof conditions[0] === "number") {
      return `Level ${conditions[0]}`;
    }
    if (conditions.length > 0 && typeof conditions[0] === "string") {
      return `Level up (${conditions[0]})`;
    }
    return "Level up";
  }

  if (trigger === "trade") {
    if (conditions.length > 0) {
      return `Trade (${conditions[0]})`;
    }
    return "Trade";
  }

  if (trigger === "use-item" || trigger === "use_item") {
    if (conditions.length > 0) {
      return `${capitalize(String(conditions[0]))}`;
    }
    return "Item";
  }

  // Fallback: capitalize the trigger and include conditions
  const desc = capitalize(trigger.replace(/[-_]/g, " "));
  if (conditions.length > 0) {
    return `${desc} (${conditions.join(", ")})`;
  }
  return desc;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`[fetch] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Encounter index builder
// ---------------------------------------------------------------------------

interface CatchLocationEntry {
  locationId: string;
  locationName: string;
  method: EncounterMethod;
  rate: number;
  milestoneRequired: string;
}

/**
 * Build a lookup from lowercase pokemon id -> array of catch locations.
 */
function buildEncounterIndex(
  encountersData: EncountersData
): Map<string, CatchLocationEntry[]> {
  const index = new Map<string, CatchLocationEntry[]>();

  for (const [mapName, methodGroups] of Object.entries(encountersData)) {
    const locationId = mapNameToId(mapName);
    const locationName = mapNameToReadable(mapName);

    for (const [groupKey, group] of Object.entries(methodGroups)) {
      if (!group || !group.mons) continue;

      const method = mapEncounterMethod(groupKey);

      for (const mon of group.mons) {
        const pokemonId = speciesNameToId(mon.species);
        // Use the per-mon encounter rate if present, otherwise derive from
        // group encounter rate. The per-mon rate may not exist in all
        // data versions, so fall back to dividing group rate by mon count.
        const rate = mon.encounter_rate ?? Math.round(group.encounter_rate / group.mons.length);

        const entry: CatchLocationEntry = {
          locationId,
          locationName,
          method,
          rate,
          milestoneRequired: "game_start",
        };

        if (!index.has(pokemonId)) {
          index.set(pokemonId, []);
        }
        index.get(pokemonId)!.push(entry);
      }
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Pokemon transformer
// ---------------------------------------------------------------------------

function transformPokemon(
  raw: BorriusPokemon,
  encounterIndex: Map<string, CatchLocationEntry[]>
): OutputPokemon {
  const pokemonId = raw.name.toLowerCase();

  // -- Types --
  const types = raw.types.map(normalizeType);

  // -- Base stats --
  const baseStats = {
    hp: raw.stats.hp.base_stat,
    attack: raw.stats.attack.base_stat,
    defense: raw.stats.defense.base_stat,
    spAttack: raw.stats.specialAttack.base_stat,
    spDefense: raw.stats.specialDefense.base_stat,
    speed: raw.stats.speed.base_stat,
  };

  // -- Abilities --
  // Convention: if there are 3 abilities, the last one is the hidden ability.
  // If there are 2 or fewer, none are hidden.
  const abilities = raw.abilities.map((ab, idx) => ({
    name: ab.ability_name,
    isHidden: raw.abilities.length >= 3 && idx === raw.abilities.length - 1,
  }));

  // -- Learnset --
  const learnset = raw.moves.map((mv) => {
    const source = normalizeMoveSource(mv.method);
    const level = source === "level-up" ? parseStatOrNull(mv.level_learned_at) ?? undefined : undefined;

    // Extract TM number if the method contains it (e.g. "TM01", "machine")
    let tmNumber: string | undefined;
    if (source === "tm") {
      const tmMatch = mv.method.match(/TM(\d+)/i);
      if (tmMatch) {
        tmNumber = `TM${tmMatch[1].padStart(2, "0")}`;
      }
    }

    return {
      name: mv.name,
      type: normalizeType(mv.type),
      category: normalizeCategory(mv.category),
      power: parseStatOrNull(mv.power),
      accuracy: parseStatOrNull(mv.accuracy),
      pp: parseStatOrNull(mv.pp ?? "0") ?? 0,
      source,
      ...(level !== undefined ? { level } : {}),
      ...(tmNumber !== undefined ? { tmNumber } : {}),
    };
  });

  // -- Evolution chain --
  const evolutionChain = raw.evolution_chain.map((evo) => ({
    pokemonId: evo.evo_name.toLowerCase(),
    pokemonName: capitalize(evo.evo_name),
    method: buildEvolutionMethod(evo.evo_trigger, evo.evo_conditions),
  }));

  // -- Catch locations (from encounter index) --
  const catchLocations = encounterIndex.get(pokemonId) ?? [];

  // -- Sprite URL (PokeAPI style) --
  const spriteUrl = raw.national_id
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${raw.national_id}.png`
    : undefined;

  return {
    id: pokemonId,
    dexNumber: raw.national_id,
    name: capitalize(pokemonId),
    types: types as PokemonType[],
    baseStats,
    abilities,
    learnset,
    evolutionChain,
    catchLocations,
    milestoneRequired: "game_start",
    ...(spriteUrl ? { spriteUrl } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Pokemon Unbound Companion -- Pokemon Scraper");
  console.log("=============================================\n");

  // 1. Fetch data sources in parallel
  const [borriusData, encountersData] = await Promise.all([
    fetchJson<BorriusPokemon[]>(BORRIUS_POKEDEX_URL),
    fetchJson<EncountersData>(ENCOUNTERS_URL),
  ]);

  console.log(`\n[data] Borrius Pokedex: ${borriusData.length} Pokemon loaded`);
  console.log(`[data] Encounters: ${Object.keys(encountersData).length} maps loaded\n`);

  // 2. Build encounter lookup
  const encounterIndex = buildEncounterIndex(encountersData);
  console.log(`[data] Encounter index: ${encounterIndex.size} unique Pokemon have encounter data\n`);

  // 3. Transform all Pokemon
  const pokemon: OutputPokemon[] = borriusData.map((raw) =>
    transformPokemon(raw, encounterIndex)
  );

  // 4. Write output
  const outputPath = resolve(
    dirname(new URL(import.meta.url).pathname),
    "../../data/pokemon.json"
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(pokemon, null, 2), "utf-8");

  console.log(`[output] Wrote ${pokemon.length} Pokemon to ${outputPath}\n`);

  // 5. Summary
  console.log("--- Summary ---");
  console.log(`Total Pokemon: ${pokemon.length}`);

  const withLocations = pokemon.filter((p) => p.catchLocations.length > 0);
  console.log(`Pokemon with catch locations: ${withLocations.length}`);

  const withMoves = pokemon.filter((p) => p.learnset.length > 0);
  console.log(`Pokemon with learnset data: ${withMoves.length}`);

  const withEvolutions = pokemon.filter((p) => p.evolutionChain.length > 1);
  console.log(`Pokemon with evolution chains (>1 stage): ${withEvolutions.length}`);

  // Print a few sample entries
  console.log("\n--- Sample Entries ---\n");
  const samples = pokemon.slice(0, 3);
  for (const sample of samples) {
    console.log(`  ${sample.name} (#${sample.dexNumber})`);
    console.log(`    Types: ${sample.types.join(", ")}`);
    console.log(`    Stats: HP=${sample.baseStats.hp} Atk=${sample.baseStats.attack} Def=${sample.baseStats.defense} SpA=${sample.baseStats.spAttack} SpD=${sample.baseStats.spDefense} Spe=${sample.baseStats.speed}`);
    console.log(`    Abilities: ${sample.abilities.map((a) => `${a.name}${a.isHidden ? " (Hidden)" : ""}`).join(", ")}`);
    console.log(`    Moves: ${sample.learnset.length}`);
    console.log(`    Catch locations: ${sample.catchLocations.length}`);
    console.log(`    Evolution chain: ${sample.evolutionChain.map((e) => `${e.pokemonName} [${e.method}]`).join(" -> ")}`);
    console.log("");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("[error] Scraper failed:", err);
  process.exit(1);
});
