/**
 * Locations Towns Scraper for Pokemon Unbound Companion
 *
 * Supplements existing locations.json with towns and areas from
 * unboundwiki.com/locations/ that are missing from the GitHub encounter data.
 *
 * The wiki page has 3 sections (h2 headings):
 *   - Towns and Cities
 *   - Routes and Outdoor Areas
 *   - Caves and Dungeons
 *
 * Each section has a table with columns: Name, Linked Locations, Screenshot
 *
 * Run with: npx tsx scripts/scrapers/locations-towns.ts
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fetchAndParse, cleanText } from "./wiki-utils";

interface Location {
  id: string;
  name: string;
  category: "town" | "route" | "dungeon" | "building" | "special";
  encounters: never[];
  items: never[];
  trainers: never[];
  milestoneRequired: string;
  connectedLocations: string[];
}

/**
 * Convert a location name like "Frozen Heights" to an ID.
 */
function toLocationId(name: string): string {
  return name
    .replace(/['']/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Map category from wiki section heading.
 */
function sectionToCategory(
  sectionName: string
): "town" | "route" | "dungeon" {
  if (sectionName.toLowerCase().includes("town")) return "town";
  if (sectionName.toLowerCase().includes("route")) return "route";
  return "dungeon";
}

/**
 * Hardcoded milestone mapping for known towns/areas.
 * Based on game progression order from the walkthrough.
 */
const MILESTONE_MAP: Record<string, string> = {
  frozen_heights: "game_start",
  bellin_town: "game_start",
  dresco_town: "game_start",
  crater_town: "badge_1",
  blizzard_city: "badge_2",
  magnolia_town: "badge_6",
  battle_frontier: "post_game",
  kbt_expressway: "game_start",
  shadow_base: "badge_7",
  antisis_port: "badge_5",
  ss_marine: "post_game",
  fullmoon_and_newmoon_island: "post_game",
  black_ferrothorn_turf: "badge_5",
  seaport_warehouses: "badge_6",
  tarmigan_mansion: "badge_3",
  cinder_volcano_depths: "badge_4",
  underground_pass: "badge_2",
  thundercap_mountain: "badge_3",
};

export async function scrapeLocationsTowns(): Promise<void> {
  console.log("[locations-towns] Fetching locations from unboundwiki.com...");

  const $ = await fetchAndParse("/locations/");

  // Read existing locations
  const dataDir = path.resolve(__dirname, "../../data");
  const outputPath = path.join(dataDir, "locations.json");

  let existingLocations: Location[] = [];
  try {
    const raw = await readFile(outputPath, "utf-8");
    existingLocations = JSON.parse(raw);
  } catch {
    console.log("[locations-towns] No existing locations.json found, starting fresh.");
  }

  const existingIds = new Set(existingLocations.map((l) => l.id));

  // Parse wiki locations from each section
  const wikiLocations: Location[] = [];
  const sections = ["Towns and Cities", "Routes and Outdoor Areas", "Caves and Dungeons"];

  $("table").each((tableIdx, table) => {
    const category = tableIdx === 0 ? "town" : tableIdx === 1 ? "route" : "dungeon";

    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        // Cell 0: Location name (may be inside <strong><a>)
        const nameRaw = cells.eq(0).text().trim().replace(/\u00a0/g, " ");
        if (!nameRaw) return;

        const id = toLocationId(nameRaw);

        // Cell 1: Linked/connected locations (separated by <br>)
        const linkedHtml = cells.eq(1).html() || "";
        const connectedLocations = linkedHtml
          .split(/<br\s*\/?>/)
          .map((part) =>
            part.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
          )
          .filter(Boolean)
          .map(toLocationId);

        const milestone = MILESTONE_MAP[id] || "game_start";

        wikiLocations.push({
          id,
          name: nameRaw,
          category,
          encounters: [],
          items: [],
          trainers: [],
          milestoneRequired: milestone,
          connectedLocations,
        });
      });
  });

  console.log(`[locations-towns] Found ${wikiLocations.length} locations on wiki.`);

  // Merge: add wiki locations that are missing from existing data
  let addedCount = 0;
  for (const wikiLoc of wikiLocations) {
    // Check for exact match or partial match (existing data may have sub-locations)
    const hasExact = existingIds.has(wikiLoc.id);
    const hasPartial = [...existingIds].some(
      (id) => id.startsWith(wikiLoc.id + "_") || id === wikiLoc.id
    );

    if (!hasExact && !hasPartial) {
      existingLocations.push(wikiLoc);
      existingIds.add(wikiLoc.id);
      addedCount++;
      console.log(`  [+] Added: ${wikiLoc.name} (${wikiLoc.id})`);
    }
  }

  // Also update connected locations for existing entries where they're empty
  for (const existing of existingLocations) {
    if (existing.connectedLocations.length === 0) {
      const wikiMatch = wikiLocations.find((w) => w.id === existing.id);
      if (wikiMatch && wikiMatch.connectedLocations.length > 0) {
        existing.connectedLocations = wikiMatch.connectedLocations;
      }
    }
  }

  // Sort alphabetically by ID
  existingLocations.sort((a, b) => a.id.localeCompare(b.id));

  await mkdir(dataDir, { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(existingLocations, null, 2),
    "utf-8"
  );

  console.log(
    `[locations-towns] Added ${addedCount} new locations. Total: ${existingLocations.length}`
  );
}

// Allow direct execution
if (require.main === module) {
  scrapeLocationsTowns().catch((err) => {
    console.error("[locations-towns] Scraper failed:", err);
    process.exit(1);
  });
}
