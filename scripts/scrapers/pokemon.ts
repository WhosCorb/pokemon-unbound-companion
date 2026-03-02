/**
 * Pokemon Scraper for Pokemon Unbound Companion
 *
 * Fetches Pokemon data from unboundwiki.com (primary) merged with Borrius
 * (stats only) and Unbound encounters (catch locations).
 *
 * Data sources:
 * 1. unboundwiki.com (primary: types, abilities, evolution, full learnset)
 * 2. Borrius Pokedex Scraper (secondary: base stats only)
 * 3. Unbound encounters.json (catch locations per map)
 *
 * Run with: npx tsx scripts/scrapers/pokemon.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import * as cheerio from "cheerio";
import { fetchAndParse, cleanText } from "./wiki-utils";

type CheerioAPI = ReturnType<typeof cheerio.load>;

// ---------------------------------------------------------------------------
// Source URLs
// ---------------------------------------------------------------------------

const BORRIUS_POKEDEX_URL =
  "https://raw.githubusercontent.com/nMckenryan/Borrius-Pokedex-Scraper/main/scraperData/borrius_pokedex_data.json";

const ENCOUNTERS_URL =
  "https://raw.githubusercontent.com/ydarissep/Unbound-Pokedex/main/src/locations/encounters.json";

// ---------------------------------------------------------------------------
// Output types (mirrors src/lib/types.ts)
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
// Borrius / Encounter source interfaces
// ---------------------------------------------------------------------------

interface BorriusStat { base_stat: number }
interface BorriusAbility { ability_name: string; slot: number }
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
}
interface BorriusDataWrapper {
  info: { description: string; dataPulledOn: string };
  pokemon: BorriusPokemon[];
}

interface EncounterSlot {
  species: string;
  minLevel: number;
  maxLevel: number;
}
interface EncounterMethodGroup {
  encounterRate: number;
  slots: EncounterSlot[];
}
interface EncounterMapEntry {
  mapGroup: number;
  mapNum: number;
  mapName: string;
  encounters: Record<string, EncounterMethodGroup>;
}

// Wiki-scraped data for a single Pokemon
interface WikiPokemonData {
  name: string;
  url: string;
  natDex: number;
  borDex: number;
  types: PokemonType[];
  abilities: { name: string; isHidden: boolean }[];
  evolutionChain: { pokemonId: string; pokemonName: string; method: string }[];
  learnset: OutputPokemon["learnset"];
}

// Pokemon index entry from the wiki index page
interface PokemonIndexEntry {
  name: string;
  url: string;
  natDex: number;
  borDex: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set<string>([
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
]);

function normalizeType(raw: string): PokemonType {
  const lower = raw.toLowerCase().trim();
  return VALID_TYPES.has(lower) ? (lower as PokemonType) : "normal";
}

function normalizeCategory(raw: string): "physical" | "special" | "status" {
  const lower = raw.toLowerCase().trim();
  if (lower === "physical") return "physical";
  if (lower === "special") return "special";
  return "status";
}

function parseNumOrNull(val: string): number | null {
  if (!val || val === "-" || val === "\u2013" || val === "" || val === "null") return null;
  const cleaned = val.replace(/%/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert a Pokemon name to a slug-style ID. */
function nameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract slug from a wiki URL like https://unboundwiki.com/pokemon/larvitar/ */
function slugFromUrl(url: string): string {
  const match = url.match(/\/pokemon\/([^/]+)\/?$/);
  return match ? match[1] : "";
}

function mapNameToReadable(raw: string): string {
  return raw.split("_").map((w) => capitalize(w.toLowerCase())).join(" ");
}

function mapNameToId(raw: string): string {
  return raw.toLowerCase().replace(/_/g, "-");
}

function speciesNameToId(species: string): string {
  return species.replace(/^SPECIES_/, "").toLowerCase().replace(/_/g, "-");
}

function mapEncounterMethod(groupKey: string): EncounterMethod {
  const mapping: Record<string, EncounterMethod> = {
    grassAnytime: "grass", grassDay: "grass", grassNight: "grass",
    water: "surf", rockSmash: "rock-smash",
    fishing: "fishing-old", oldRod: "fishing-old",
    goodRod: "fishing-good", superRod: "fishing-super",
    hidden: "grass", honeyTree: "headbutt", headbutt: "headbutt",
    raid: "raid", land_mons: "grass", water_mons: "surf",
    rock_smash_mons: "rock-smash",
  };
  return mapping[groupKey] ?? "grass";
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`[fetch] ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Step 1: Build TM/HM Number Lookup
// ---------------------------------------------------------------------------

async function buildTmLookup(): Promise<Map<string, string>> {
  console.log("[pokemon] Step 1: Building TM/HM number lookup...");
  const $ = await fetchAndParse("/tms-hms");
  const lookup = new Map<string, string>();

  $("table").each((_tableIdx, table) => {
    $(table).find("tr").each((_i, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return;

      const firstCell = cleanText(cells.first().text());

      // Match "TM001 Focus Punch" or "HM01 Cut"
      const match = firstCell.match(/^((?:TM|HM)\d+)\s+(.+)$/);
      if (match) {
        const tmNumber = match[1];
        const moveName = match[2].trim();
        lookup.set(moveName.toLowerCase(), tmNumber);
      }
    });
  });

  console.log(`[pokemon]   Found ${lookup.size} TM/HM entries`);
  return lookup;
}

// ---------------------------------------------------------------------------
// Step 2: Fetch Pokemon Index
// ---------------------------------------------------------------------------

async function fetchPokemonIndex(): Promise<PokemonIndexEntry[]> {
  console.log("[pokemon] Step 2: Fetching Pokemon index...");
  const $ = await fetchAndParse("/pokemon/");
  const entries: PokemonIndexEntry[] = [];
  const seenUrls = new Set<string>();

  const table = $("table").first();

  table.find("tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return;

    // Standard rows have 5 cols: NAT DEX, BOR DEX, Name/Type, Image, Location
    // Variant rows have 3 cols: Name/Type, Image, Location (no dex numbers)
    let natDex = 0;
    let borDex = 0;
    let nameCell;

    if (cells.length >= 5) {
      // Standard Pokemon row
      const natText = cleanText($(cells[0]).text());
      const borText = cleanText($(cells[1]).text());
      natDex = parseInt(natText, 10) || 0;
      borDex = parseInt(borText, 10) || 0;
      nameCell = $(cells[2]);
    } else if (cells.length >= 3) {
      // Variant row (no dex numbers)
      nameCell = $(cells[0]);
    } else {
      return;
    }

    if (!nameCell) return;

    const link = nameCell.find("a").first();
    if (!link.length) return;

    const href = link.attr("href");
    if (!href || !href.includes("/pokemon/")) return;

    // Deduplicate
    if (seenUrls.has(href)) return;
    seenUrls.add(href);

    const name = cleanText(link.text());
    if (!name) return;

    entries.push({ name, url: href, natDex, borDex });
  });

  console.log(`[pokemon]   Found ${entries.length} Pokemon in index`);
  return entries;
}

// ---------------------------------------------------------------------------
// Step 3: Parse Individual Pokemon Page
// ---------------------------------------------------------------------------

function parsePokemonPage(
  $: CheerioAPI,
  entry: PokemonIndexEntry,
  tmLookup: Map<string, string>
): WikiPokemonData {
  const slug = slugFromUrl(entry.url);

  // -- Types --
  const types: PokemonType[] = [];
  const infoTable = $("table").first();
  infoTable.find("tr").each((_i, row) => {
    const th = $(row).find("th").first();
    if (cleanText(th.text()) === "Type") {
      $(row).find("span.type").each((_j, span) => {
        const typeText = cleanText($(span).text());
        if (typeText) types.push(normalizeType(typeText));
      });
      // Fallback: parse from td text if no span.type found
      if (types.length === 0) {
        const td = $(row).find("td").first();
        const typeTexts = cleanText(td.text()).split(/\s+/);
        for (const t of typeTexts) {
          if (VALID_TYPES.has(t.toLowerCase())) {
            types.push(normalizeType(t));
          }
        }
      }
    }
  });

  // Fallback type
  if (types.length === 0) types.push("normal");

  // -- Abilities --
  const abilities: { name: string; isHidden: boolean }[] = [];
  let inAbilities = false;
  infoTable.find("tr").each((_i, row) => {
    const th = $(row).find("th").first();
    const thText = cleanText(th.text());
    if (thText === "Abilities") {
      inAbilities = true;
    } else if (th.length && thText !== "") {
      inAbilities = false;
    }

    if (inAbilities) {
      const abilityName = $(row).find("td.thh3").first();
      if (abilityName.length) {
        const name = cleanText(abilityName.text());
        if (name) {
          const isHidden = cleanText($(row).text()).toLowerCase().includes("hidden");
          abilities.push({ name, isHidden });
        }
      }
    }
  });

  // If 3+ abilities and none marked hidden, mark the last as hidden (game convention)
  if (abilities.length >= 3 && !abilities.some((a) => a.isHidden)) {
    abilities[abilities.length - 1].isHidden = true;
  }

  // -- Evolution Chain --
  const evolutionChain: { pokemonId: string; pokemonName: string; method: string }[] = [];
  const evoHeading = $("h2").filter((_i, el) =>
    cleanText($(el).text()).toLowerCase().includes("evolution")
  );
  if (evoHeading.length) {
    const evoTable = evoHeading.first().next("div.table-wrap").find("table").first();
    if (!evoTable.length) {
      // Try direct next table
      const directTable = evoHeading.first().nextAll("table").first();
      if (directTable.length) {
        parseEvoTable($, directTable, evolutionChain);
      }
    } else {
      parseEvoTable($, evoTable, evolutionChain);
    }
  }

  // -- Learnset --
  const learnset: OutputPokemon["learnset"] = [];

  // Level-up moves
  parseMovesFromSection($, ["Moveset (Level Up)"], "level-up", learnset, tmLookup);
  // TM/HM moves
  parseMovesFromSection($, ["Learnset (TM/HM)"], "tm", learnset, tmLookup);
  // Tutor moves (heading varies between pages)
  parseMovesFromSection($, ["Move Tutor Moves", "Learnset (Move Tutor)"], "tutor", learnset, tmLookup);
  // Egg moves
  parseMovesFromSection($, ["Egg Moves"], "egg", learnset, tmLookup);

  return {
    name: entry.name,
    url: entry.url,
    natDex: entry.natDex,
    borDex: entry.borDex,
    types,
    abilities,
    evolutionChain,
    learnset,
  };
}

function parseEvoTable(
  $: CheerioAPI,
  table: ReturnType<CheerioAPI>,
  chain: { pokemonId: string; pokemonName: string; method: string }[]
): void {
  table.find("tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    // Tables may have 2 or 3+ columns:
    //   2-col: [Pokemon (name+link), Method]
    //   3-col: [Sprite, Pokemon (name+link), Method]
    //   3-col branching: ["From X ->", Pokemon (name+link), Method]
    // Find the cell with a Pokemon link (href containing /pokemon/)
    let nameCell = null;
    let methodCell = null;

    for (let i = 0; i < cells.length; i++) {
      const link = $(cells[i]).find("a[href*='/pokemon/']").first();
      if (link.length) {
        nameCell = cells[i];
        methodCell = cells[cells.length - 1];
        break;
      }
    }

    // If no link found, try the first non-empty text cell
    if (!nameCell) {
      for (let i = 0; i < cells.length; i++) {
        const text = cleanText($(cells[i]).text());
        if (text && !text.startsWith("From ")) {
          nameCell = cells[i];
          methodCell = cells[cells.length - 1];
          break;
        }
      }
    }

    if (!nameCell) return;

    const link = $(nameCell).find("a[href*='/pokemon/']").first();
    const name = link.length ? cleanText(link.text()) : cleanText($(nameCell).text());
    if (!name || name.startsWith("From ")) return;

    let pokemonId: string;
    const href = link.attr("href");
    if (href) {
      pokemonId = slugFromUrl(href) || nameToId(name);
    } else {
      pokemonId = nameToId(name);
    }

    let method = "";
    if (methodCell) {
      // Replace <br> with " / " before extracting text so lines don't concatenate
      const methodHtml = $(methodCell).html() || "";
      const $tmp = cheerio.load(`<span>${methodHtml.replace(/<br\s*\/?>/gi, " / ")}</span>`);
      method = cleanText($tmp("span").text());
    }

    chain.push({ pokemonId, pokemonName: name, method: method || "Base form" });
  });
}

function parseMovesFromSection(
  $: CheerioAPI,
  sectionTitles: string[],
  source: "level-up" | "tm" | "tutor" | "egg",
  learnset: OutputPokemon["learnset"],
  tmLookup: Map<string, string>
): void {
  let heading = $("__nonexistent__");
  for (const title of sectionTitles) {
    heading = $("h2").filter((_i, el) => cleanText($(el).text()) === title);
    if (heading.length) break;
  }
  if (!heading.length) return;

  // The table is inside a div.table-wrap immediately after the heading
  const wrapper = heading.first().next("div.table-wrap");
  const table = wrapper.find("table").first();
  if (!table.length) return;

  const isLevelUp = source === "level-up";

  table.find("tbody tr, tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return;

    let colIdx = 0;

    // Level-up has 7 cols: Lv, Move, Type, Cat, Power, Acc, PP
    // Others have 6 cols: Move, Type, Cat, Power, Acc, PP
    let level: number | undefined;
    if (isLevelUp) {
      const lvText = cleanText($(cells[colIdx]).text());
      level = parseInt(lvText, 10) || undefined;
      colIdx++;
    }

    if (cells.length - colIdx < 6) return;

    const moveName = cleanText($(cells[colIdx]).text());
    colIdx++;

    // Type: could be in a span.type or just text
    const typeCell = $(cells[colIdx]);
    const typeSpan = typeCell.find("span.type").first();
    const typeText = typeSpan.length ? cleanText(typeSpan.text()) : cleanText(typeCell.text());
    const type = normalizeType(typeText);
    colIdx++;

    // Category: uses img with alt text "Physical"/"Special"/"Status"
    const catCell = $(cells[colIdx]);
    const catImg = catCell.find("img").first();
    const catText = catImg.length
      ? (catImg.attr("alt") || "status")
      : cleanText(catCell.text());
    const category = normalizeCategory(catText);
    colIdx++;

    // Power
    const power = parseNumOrNull(cleanText($(cells[colIdx]).text()));
    colIdx++;

    // Accuracy
    const accuracy = parseNumOrNull(cleanText($(cells[colIdx]).text()));
    colIdx++;

    // PP
    const ppVal = parseNumOrNull(cleanText($(cells[colIdx]).text()));
    const pp = ppVal ?? 0;

    if (!moveName) return;

    // TM number lookup for TM/HM moves
    let tmNumber: string | undefined;
    if (source === "tm") {
      tmNumber = tmLookup.get(moveName.toLowerCase());
    }

    const moveEntry: OutputPokemon["learnset"][number] = {
      name: moveName,
      type,
      category,
      power,
      accuracy,
      pp,
      source,
    };

    if (level !== undefined) moveEntry.level = level;
    if (tmNumber !== undefined) moveEntry.tmNumber = tmNumber;

    learnset.push(moveEntry);
  });
}

// ---------------------------------------------------------------------------
// Step 4: Batch Processing
// ---------------------------------------------------------------------------

async function scrapeAllPokemon(
  entries: PokemonIndexEntry[],
  tmLookup: Map<string, string>
): Promise<{ results: WikiPokemonData[]; errors: string[] }> {
  console.log(`[pokemon] Step 3-4: Scraping ${entries.length} Pokemon pages...`);
  const results: WikiPokemonData[] = [];
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const slug = slugFromUrl(entry.url);
    const path = `/pokemon/${slug}/`;

    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`[pokemon]   Progress: ${i + 1}/${entries.length} (${entry.name})`);
    }

    try {
      const $ = await fetchAndParse(path);
      const data = parsePokemonPage($, entry, tmLookup);
      results.push(data);
    } catch (err) {
      const msg = `Failed to scrape ${entry.name} (${path}): ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
    }
  }

  // Retry pass for failures
  if (errors.length > 0) {
    console.log(`[pokemon]   Retrying ${errors.length} failures...`);
    const retryErrors: string[] = [];
    const failedNames = new Set(
      errors.map((e) => {
        const match = e.match(/Failed to scrape (.+?) \(/);
        return match ? match[1] : "";
      })
    );

    for (const entry of entries) {
      if (!failedNames.has(entry.name)) continue;
      const slug = slugFromUrl(entry.url);
      const path = `/pokemon/${slug}/`;

      try {
        const $ = await fetchAndParse(path);
        const data = parsePokemonPage($, entry, tmLookup);
        results.push(data);
      } catch (err) {
        retryErrors.push(
          `[retry] Failed to scrape ${entry.name}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (retryErrors.length > 0) {
      console.log(`[pokemon]   ${retryErrors.length} Pokemon still failing after retry:`);
      for (const e of retryErrors) console.log(`    ${e}`);
    }
  }

  console.log(`[pokemon]   Successfully scraped ${results.length}/${entries.length} Pokemon`);
  return { results, errors };
}

// ---------------------------------------------------------------------------
// Step 5: Merge Data Sources
// ---------------------------------------------------------------------------

interface CatchLocationEntry {
  locationId: string;
  locationName: string;
  method: EncounterMethod;
  rate: number;
  milestoneRequired: string;
}

function buildEncounterIndex(
  encountersData: EncounterMapEntry[]
): Map<string, CatchLocationEntry[]> {
  const index = new Map<string, CatchLocationEntry[]>();

  for (const mapEntry of encountersData) {
    const locationId = mapNameToId(mapEntry.mapName);
    const locationName = mapNameToReadable(mapEntry.mapName);
    if (!mapEntry.encounters) continue;

    for (const [groupKey, group] of Object.entries(mapEntry.encounters)) {
      if (!group || !group.slots) continue;
      const method = mapEncounterMethod(groupKey);
      const totalSlots = group.slots.length;

      for (const slot of group.slots) {
        const pokemonId = speciesNameToId(slot.species);
        const rate = Math.round(100 / Math.max(totalSlots, 1));
        const entry: CatchLocationEntry = {
          locationId, locationName, method, rate, milestoneRequired: "game_start",
        };
        if (!index.has(pokemonId)) index.set(pokemonId, []);
        index.get(pokemonId)!.push(entry);
      }
    }
  }

  return index;
}

/** Build a lookup from normalized name to Borrius stats. */
function buildBorriusStatsIndex(
  borriusData: BorriusPokemon[]
): Map<string, BorriusPokemon> {
  const index = new Map<string, BorriusPokemon>();
  for (const mon of borriusData) {
    const name = mon.name.toLowerCase();
    index.set(name, mon);

    // Also index without form suffixes for matching:
    // "minior-red-meteor" -> also index as "minior"
    // "oricorio-baile" -> also index as "oricorio"
    // "darmanitan-standard" -> also index as "darmanitan"
    // "basculin-red-striped" -> also index as "basculin"
    const formSuffixes = [
      "-red-meteor", "-baile", "-average", "-plant", "-male",
      "-solo", "-red-striped", "-standard", "-land",
      "-altered", "-normal", "-incarnate", "-aria",
      "-shield", "-50", "-midday", "-average-size",
    ];
    for (const suffix of formSuffixes) {
      if (name.endsWith(suffix)) {
        const baseName = name.slice(0, -suffix.length);
        if (!index.has(baseName)) {
          index.set(baseName, mon);
        }
      }
    }

    // Special case: "mime jr." -> "mime-jr"
    if (name === "mime jr.") {
      index.set("mime-jr", mon);
    }
  }
  return index;
}

/**
 * Try to match a wiki Pokemon name to a Borrius entry.
 * Handles variant naming differences.
 */
function findBorriusMatch(
  wikiName: string,
  borriusIndex: Map<string, BorriusPokemon>
): BorriusPokemon | undefined {
  const lower = wikiName.toLowerCase();

  // Direct match
  if (borriusIndex.has(lower)) return borriusIndex.get(lower);

  // Try slug form
  const slug = nameToId(wikiName);
  if (borriusIndex.has(slug)) return borriusIndex.get(slug);

  // Variant normalization: "alolan-vulpix" <-> "vulpix-alola"
  const variantPrefixes = ["alolan", "galarian", "hisuian", "paldean"];
  for (const prefix of variantPrefixes) {
    if (slug.startsWith(`${prefix}-`)) {
      const base = slug.replace(`${prefix}-`, "");
      const suffix = prefix.replace(/an$/, "a").replace(/ian$/, "i");
      const altForm = `${base}-${suffix}`;
      if (borriusIndex.has(altForm)) return borriusIndex.get(altForm);
    }
  }

  // "mega-charizard-x" <-> "charizard-mega-x"
  if (slug.startsWith("mega-")) {
    const rest = slug.replace("mega-", "");
    const altForm = `${rest.replace(/-([xy])$/, "")}-mega${rest.match(/-([xy])$/)?.[0] || ""}`;
    if (borriusIndex.has(altForm)) return borriusIndex.get(altForm);
  }

  return undefined;
}

function mergeIntoOutputPokemon(
  wikiData: WikiPokemonData,
  borriusIndex: Map<string, BorriusPokemon>,
  encounterIndex: Map<string, CatchLocationEntry[]>
): OutputPokemon {
  const pokemonId = slugFromUrl(wikiData.url) || nameToId(wikiData.name);
  const borrius = findBorriusMatch(wikiData.name, borriusIndex);

  // Stats from Borrius, defaulting to zeros
  const baseStats = borrius
    ? {
        hp: borrius.stats.hp.base_stat,
        attack: borrius.stats.attack.base_stat,
        defense: borrius.stats.defense.base_stat,
        spAttack: borrius.stats.specialAttack.base_stat,
        spDefense: borrius.stats.specialDefense.base_stat,
        speed: borrius.stats.speed.base_stat,
      }
    : { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  // Dex number: prefer wiki nat dex, fallback to Borrius
  const dexNumber = wikiData.natDex || borrius?.national_id || 0;

  // Catch locations from encounter index
  const catchLocations = encounterIndex.get(pokemonId) ?? [];

  // Sprite URL
  const spriteUrl = dexNumber
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png`
    : undefined;

  return {
    id: pokemonId,
    dexNumber,
    name: wikiData.name,
    types: wikiData.types,
    baseStats,
    abilities: wikiData.abilities,
    learnset: wikiData.learnset,
    evolutionChain: wikiData.evolutionChain,
    catchLocations,
    milestoneRequired: "game_start",
    ...(spriteUrl ? { spriteUrl } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

const OUTPUT_DIR = join(__dirname, "..", "..", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "pokemon.json");

export async function scrapePokemon(): Promise<void> {
  console.log("Pokemon Unbound Companion -- Pokemon Scraper (Wiki Edition)");
  console.log("============================================================\n");

  // Step 1: Build TM lookup
  const tmLookup = await buildTmLookup();

  // Step 2: Fetch Pokemon index
  const pokemonIndex = await fetchPokemonIndex();

  // Step 3-4: Scrape all Pokemon pages
  const { results: wikiData } = await scrapeAllPokemon(pokemonIndex, tmLookup);

  // Fetch secondary data sources in parallel
  console.log("\n[pokemon] Step 5: Fetching secondary data sources...");
  const [borriusRaw, encountersData] = await Promise.all([
    fetchJson<BorriusDataWrapper[]>(BORRIUS_POKEDEX_URL),
    fetchJson<EncounterMapEntry[]>(ENCOUNTERS_URL),
  ]);

  const borriusData = borriusRaw[0]?.pokemon ?? [];
  console.log(`[pokemon]   Borrius: ${borriusData.length} Pokemon loaded`);
  console.log(`[pokemon]   Encounters: ${encountersData.length} maps loaded`);

  // Build indexes
  const borriusIndex = buildBorriusStatsIndex(borriusData);
  const encounterIndex = buildEncounterIndex(encountersData);
  console.log(`[pokemon]   Encounter index: ${encounterIndex.size} unique Pokemon`);

  // Merge all sources
  console.log("[pokemon]   Merging data sources...");
  const pokemon: OutputPokemon[] = wikiData.map((wiki) =>
    mergeIntoOutputPokemon(wiki, borriusIndex, encounterIndex)
  );

  // Count Pokemon without Borrius stats
  const noStats = pokemon.filter((p) => p.baseStats.hp === 0);
  if (noStats.length > 0) {
    console.log(`[pokemon]   WARNING: ${noStats.length} Pokemon have no base stats (not in Borrius data)`);
  }

  // Step 6: Write output
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(pokemon, null, 2), "utf-8");
  console.log(`\n[pokemon] Wrote ${pokemon.length} Pokemon to ${OUTPUT_FILE}`);

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Total Pokemon: ${pokemon.length}`);

  const withLocations = pokemon.filter((p) => p.catchLocations.length > 0);
  console.log(`Pokemon with catch locations: ${withLocations.length}`);

  const withMoves = pokemon.filter((p) => p.learnset.length > 0);
  console.log(`Pokemon with learnset data: ${withMoves.length}`);

  const sources = { "level-up": 0, tm: 0, tutor: 0, egg: 0 };
  for (const p of pokemon) {
    for (const m of p.learnset) {
      sources[m.source]++;
    }
  }
  console.log(`Move breakdown: level-up=${sources["level-up"]}, tm=${sources.tm}, tutor=${sources.tutor}, egg=${sources.egg}`);

  const withTmNumbers = pokemon.flatMap((p) => p.learnset).filter((m) => m.tmNumber);
  console.log(`TM moves with tmNumber populated: ${withTmNumbers.length}`);

  const withEvolutions = pokemon.filter((p) => p.evolutionChain.length > 1);
  console.log(`Pokemon with evolution chains (>1 stage): ${withEvolutions.length}`);

  // Spot-check samples
  console.log("\n--- Spot Checks ---");
  const checks = ["larvitar", "tyranitar", "alolan-vulpix", "zekrom", "absol"];
  for (const name of checks) {
    const p = pokemon.find((p) => p.id === name);
    if (p) {
      const levelUp = p.learnset.filter((m) => m.source === "level-up").length;
      const tm = p.learnset.filter((m) => m.source === "tm").length;
      const tutor = p.learnset.filter((m) => m.source === "tutor").length;
      const egg = p.learnset.filter((m) => m.source === "egg").length;
      console.log(`  ${p.name} (#${p.dexNumber}): ${p.types.join("/")} | ${levelUp} level-up, ${tm} TM, ${tutor} tutor, ${egg} egg | stats: HP=${p.baseStats.hp} | evo chain: ${p.evolutionChain.length} stages`);
    } else {
      console.log(`  ${name}: NOT FOUND`);
    }
  }

  console.log("\nDone.");
}

// Allow direct execution
const isDirectRun = process.argv[1]?.endsWith("pokemon.ts") || process.argv[1]?.endsWith("pokemon.js");
if (isDirectRun) {
  scrapePokemon().catch((err) => {
    console.error("[pokemon] Scraper failed:", err);
    process.exit(1);
  });
}
