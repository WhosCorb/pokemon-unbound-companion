/**
 * Generate src/lib/save-data/species-data.ts from PokeAPI CSV data.
 *
 * Fetches pokemon_species.csv and growth_rates.csv from PokeAPI GitHub,
 * maps CFRU species IDs to growth rates and gender thresholds.
 *
 * Usage: npx tsx scripts/generate-species-data.ts
 */

import * as fs from "fs";
import * as path from "path";

// ── Types ─────────────────────────────────────────────

interface PokeApiSpecies {
  id: number;
  identifier: string;
  growthRateId: number;
  genderRate: number; // -1 to 8
}

type GrowthRateName =
  | "medium-fast"
  | "fast"
  | "medium-slow"
  | "slow"
  | "erratic"
  | "fluctuating";

// ── PokeAPI CSV URLs ──────────────────────────────────

const SPECIES_CSV_URL =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv";
const GROWTH_RATES_CSV_URL =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/growth_rates.csv";

// ── Gender rate to game threshold mapping ─────────────

const GENDER_RATE_TO_THRESHOLD: Record<number, number> = {
  [-1]: 255, // genderless
  [0]: 0, // always male
  [1]: 31, // 87.5% male
  [2]: 63, // 75% male
  [3]: 95, // 62.5% male (rare)
  [4]: 127, // 50/50
  [5]: 159, // 37.5% male (rare)
  [6]: 191, // 25% male
  [7]: 225, // 12.5% male
  [8]: 254, // always female
};

// ── PokeAPI growth_rate identifier to our type ────────

const GROWTH_RATE_MAP: Record<string, GrowthRateName> = {
  slow: "slow",
  medium: "medium-fast",
  fast: "fast",
  "medium-slow": "medium-slow",
  "slow-then-very-fast": "erratic",
  "fast-then-very-slow": "fluctuating",
};

// ── Manual overrides for CFRU names that don't follow patterns ──

const MANUAL_NAME_MAP: Record<string, string> = {
  darmanitanzen: "darmanitan",
  ashgreninja: "greninja",
  "shadow-warrior": "",
  egg: "",
};

// ── CSV parsing ───────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

// ── CFRU species loader ─────────────────────────────

function loadCfruSpecies(): Map<number, string> {
  const speciesPath = path.resolve(
    __dirname,
    "../src/lib/save-data/species.ts",
  );
  const content = fs.readFileSync(speciesPath, "utf-8");
  const map = new Map<number, string>();

  const regex = /\[(\d+),\s*"([^"]+)"\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    map.set(parseInt(match[1], 10), match[2]);
  }
  return map;
}

// ── Name normalization ──────────────────────────────

/**
 * Convert a CFRU species name to PokeAPI identifier format.
 * Returns empty string if the species shouldn't be mapped.
 */
function cfruNameToPokeApiName(cfruName: string): string {
  const lower = cfruName.toLowerCase().replace(/_/g, "-");

  // Check manual overrides
  if (lower in MANUAL_NAME_MAP) {
    return MANUAL_NAME_MAP[lower];
  }

  return lower;
}

/**
 * Given a PokeAPI-formatted name, try to find the base species
 * by progressively stripping form suffixes.
 */
function findBaseSpecies(
  name: string,
  knownNames: Set<string>,
): string | null {
  if (knownNames.has(name)) return name;

  // Try stripping from the right, one segment at a time
  const parts = name.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join("-");
    if (knownNames.has(candidate)) return candidate;
  }

  return null;
}

// ── Main ────────────────────────────────────────────

async function main() {
  console.log("Fetching PokeAPI CSV data...");

  const [speciesCsv, growthRatesCsv] = await Promise.all([
    fetch(SPECIES_CSV_URL).then((r) => r.text()),
    fetch(GROWTH_RATES_CSV_URL).then((r) => r.text()),
  ]);

  // Parse growth rates CSV
  const growthRateRows = parseCSV(growthRatesCsv);
  const growthRateIdToName = new Map<number, GrowthRateName>();
  for (const row of growthRateRows) {
    const id = parseInt(row.id, 10);
    const identifier = row.identifier;
    const name = GROWTH_RATE_MAP[identifier];
    if (name) {
      growthRateIdToName.set(id, name);
    }
  }

  console.log(
    "Loaded growth rates:",
    [...growthRateIdToName.values()],
  );

  // Parse species CSV
  const speciesRows = parseCSV(speciesCsv);
  const pokeApiSpecies = new Map<string, PokeApiSpecies>();
  for (const row of speciesRows) {
    const id = parseInt(row.id, 10);
    if (isNaN(id)) continue;
    pokeApiSpecies.set(row.identifier, {
      id,
      identifier: row.identifier,
      growthRateId: parseInt(row.growth_rate_id, 10),
      genderRate: parseInt(row.gender_rate, 10),
    });
  }

  console.log("Loaded species from PokeAPI:", pokeApiSpecies.size);

  // Build known names set
  const knownNames = new Set(pokeApiSpecies.keys());

  // Load CFRU species
  const cfruSpecies = loadCfruSpecies();
  console.log("Loaded CFRU species:", cfruSpecies.size);

  // Map CFRU species to growth rate + gender threshold
  const entries: [number, GrowthRateName, number, string][] = [];
  let matched = 0;
  let unmatched = 0;

  for (const [cfruId, cfruName] of cfruSpecies) {
    if (cfruId === 0 || cfruName === "NONE") continue;

    const pokeApiName = cfruNameToPokeApiName(cfruName);
    if (pokeApiName === "") {
      // Skip non-Pokemon entries (EGG, SHADOW_WARRIOR, etc.)
      continue;
    }

    const baseName = findBaseSpecies(pokeApiName, knownNames);
    if (!baseName) {
      console.warn(
        "  No match for CFRU", cfruId, cfruName, "->", pokeApiName,
      );
      unmatched++;
      // Default: medium-fast, 50/50
      entries.push([cfruId, "medium-fast", 127, cfruName]);
      continue;
    }

    const species = pokeApiSpecies.get(baseName)!;
    const growthRate =
      growthRateIdToName.get(species.growthRateId) ?? "medium-fast";
    const genderThreshold = GENDER_RATE_TO_THRESHOLD[species.genderRate] ?? 127;

    entries.push([cfruId, growthRate, genderThreshold, cfruName]);
    matched++;
  }

  console.log("Matched:", matched, "Unmatched:", unmatched);

  // Sort by CFRU ID
  entries.sort((a, b) => a[0] - b[0]);

  // Generate output
  const lines = entries.map(
    ([id, growthRate, threshold, name]) =>
      `  [${id}, ["${growthRate}", ${threshold}]],  // ${name}`,
  );

  const output = `// Auto-generated by scripts/generate-species-data.ts -- do not edit manually
// Maps CFRU species ID to [growthRate, genderThreshold]
// genderThreshold: 0=always-male, 31=87.5%M, 63=75%M, 127=50/50, 191=25%M, 225=12.5%M, 254=always-female, 255=genderless

import type { GrowthRate } from "./growth-rates";

export const SPECIES_DATA: ReadonlyMap<number, [GrowthRate, number]> = new Map([
${lines.join("\n")}
]);
`;

  const outPath = path.resolve(
    __dirname,
    "../src/lib/save-data/species-data.ts",
  );
  fs.writeFileSync(outPath, output, "utf-8");
  console.log("Wrote", entries.length, "entries to", outPath);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exitCode = 1;
});
