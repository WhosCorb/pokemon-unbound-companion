/**
 * Master Scraper Index for Pokemon Unbound Companion
 *
 * Imports and runs all individual scrapers in sequence.
 * Each scraper writes its output to the data/ directory.
 *
 * Run with: npx tsx scripts/scrapers/index.ts
 * Or:       npm run scrape
 */

import { scrapeItems } from "./items";
import { scrapeMissions } from "./missions";
import { scrapePokemon } from "./pokemon";
import { scrapeTrainers } from "./trainers";
import { scrapeProgression } from "./wiki-progression";

interface ScraperEntry {
  name: string;
  run: () => Promise<void>;
}

const scrapers: ScraperEntry[] = [
  { name: "pokemon", run: scrapePokemon },
  // { name: "locations",   run: scrapeLocations },
  { name: "trainers", run: scrapeTrainers },
  { name: "items", run: scrapeItems },
  { name: "missions", run: scrapeMissions },
  { name: "progression", run: scrapeProgression },
];

async function runAllScrapers(): Promise<void> {
  console.log(`Starting scraper pipeline (${scrapers.length} scrapers)...\n`);

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  for (const scraper of scrapers) {
    const scraperStart = Date.now();
    try {
      await scraper.run();
      const elapsed = Date.now() - scraperStart;
      console.log(`  [OK] ${scraper.name} (${elapsed}ms)`);
      passed++;
    } catch (err) {
      const elapsed = Date.now() - scraperStart;
      console.error(`  [FAIL] ${scraper.name} (${elapsed}ms):`, err);
      failed++;
    }
  }

  const totalElapsed = Date.now() - startTime;
  console.log(
    `\nScraper pipeline complete: ${passed} passed, ${failed} failed (${totalElapsed}ms total)`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

runAllScrapers().catch((err) => {
  console.error("Fatal error in scraper pipeline:", err);
  process.exit(1);
});
