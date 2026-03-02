/**
 * Pokemon Sprite Downloader
 *
 * Downloads sprites from PokeAPI's GitHub repository and saves them
 * locally to public/sprites/ for offline use.
 *
 * Source: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dexNumber}.png
 *
 * Run: npx tsx scripts/download-sprites.ts
 */

import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";
import pokemonData from "../data/pokemon.json";

const SPRITE_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const OUTPUT_DIR = join(__dirname, "..", "public", "sprites");

interface PokemonEntry {
  id: string;
  dexNumber: number;
  name: string;
}

const allPokemon = pokemonData as PokemonEntry[];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadSprite(dexNumber: number): Promise<boolean> {
  const outputPath = join(OUTPUT_DIR, `${dexNumber}.png`);

  // Skip if already downloaded
  if (await fileExists(outputPath)) {
    return true;
  }

  const url = `${SPRITE_BASE_URL}/${dexNumber}.png`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }

    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Pokemon Sprite Downloader");
  console.log("========================\n");

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Get unique dex numbers
  const dexNumbers = [...new Set(
    allPokemon
      .map((p) => p.dexNumber)
      .filter((n) => n > 0)
  )].sort((a, b) => a - b);

  console.log(`Found ${dexNumbers.length} unique Pokemon to download sprites for.\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // Download in batches of 10 for reasonable speed
  const BATCH_SIZE = 10;
  for (let i = 0; i < dexNumbers.length; i += BATCH_SIZE) {
    const batch = dexNumbers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(downloadSprite));

    for (let j = 0; j < results.length; j++) {
      if (results[j]) {
        downloaded++;
      } else {
        failed++;
        const pokemon = allPokemon.find((p) => p.dexNumber === batch[j]);
        console.warn(`  [SKIP] #${batch[j]} ${pokemon?.name ?? "Unknown"}`);
      }
    }

    // Progress indicator
    const progress = Math.min(i + BATCH_SIZE, dexNumbers.length);
    process.stdout.write(`\r  Progress: ${progress}/${dexNumbers.length}`);
  }

  console.log(`\n\nComplete!`);
  console.log(`  Downloaded/cached: ${downloaded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
