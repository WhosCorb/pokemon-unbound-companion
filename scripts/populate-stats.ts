import * as fs from "fs";
import * as path from "path";

interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

interface PokemonEntry {
  id: string;
  dexNumber: number;
  name: string;
  baseStats: BaseStats;
  [key: string]: unknown;
}

const POKEMON_PATH = path.join(__dirname, "..", "data", "pokemon.json");
const BATCH_SIZE = 20;
const DELAY_MS = 1500;

// Map PokeAPI stat names to our BaseStats keys
const STAT_MAP: Record<string, keyof BaseStats> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "spAttack",
  "special-defense": "spDefense",
  speed: "speed",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStats(dexNumber: number): Promise<BaseStats | null> {
  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${dexNumber}`
    );
    if (!res.ok) {
      console.warn(`  [SKIP] Dex #${dexNumber}: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const stats: Partial<BaseStats> = {};
    for (const entry of data.stats) {
      const key = STAT_MAP[entry.stat.name];
      if (key) {
        stats[key] = entry.base_stat;
      }
    }
    return stats as BaseStats;
  } catch (err) {
    console.warn(`  [ERR] Dex #${dexNumber}:`, err);
    return null;
  }
}

async function main() {
  console.log("Reading pokemon.json...");
  const raw = fs.readFileSync(POKEMON_PATH, "utf-8");
  const allPokemon: PokemonEntry[] = JSON.parse(raw);

  // Find Pokemon with all-zero base stats and a valid dex number
  const needStats = allPokemon.filter(
    (p) =>
      p.dexNumber > 0 &&
      p.baseStats.hp === 0 &&
      p.baseStats.attack === 0 &&
      p.baseStats.defense === 0 &&
      p.baseStats.spAttack === 0 &&
      p.baseStats.spDefense === 0 &&
      p.baseStats.speed === 0
  );

  console.log(
    `Found ${needStats.length}/${allPokemon.length} Pokemon with missing base stats.`
  );

  if (needStats.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Deduplicate by dex number (multiple forms may share the same dex number)
  const byDex = new Map<number, PokemonEntry[]>();
  for (const p of needStats) {
    const list = byDex.get(p.dexNumber) || [];
    list.push(p);
    byDex.set(p.dexNumber, list);
  }

  const dexNumbers = [...byDex.keys()].sort((a, b) => a - b);
  let updated = 0;

  for (let i = 0; i < dexNumbers.length; i += BATCH_SIZE) {
    const batch = dexNumbers.slice(i, i + BATCH_SIZE);
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: dex #${batch[0]}-#${batch[batch.length - 1]}...`
    );

    const results = await Promise.all(
      batch.map(async (dex) => {
        const stats = await fetchStats(dex);
        return { dex, stats };
      })
    );

    for (const { dex, stats } of results) {
      if (!stats) continue;
      const entries = byDex.get(dex)!;
      for (const entry of entries) {
        entry.baseStats = stats;
        updated++;
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < dexNumbers.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`Updated ${updated} Pokemon entries. Writing pokemon.json...`);
  fs.writeFileSync(POKEMON_PATH, JSON.stringify(allPokemon, null, 2));
  console.log("Done.");
}

main().catch(console.error);
