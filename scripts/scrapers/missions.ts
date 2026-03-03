/**
 * Missions Scraper for Pokemon Unbound Companion
 *
 * Scrapes all 84 missions from unboundwiki.com/missions/
 * The page contains two tables: Pre-Pokemon League and Post-Pokemon League missions.
 *
 * Run with: npx tsx scripts/scrapers/missions.ts
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fetchAndParse, cleanText } from "./wiki-utils";

interface Mission {
  id: string;
  name: string;
  description: string;
  requirements: string;
  objectives: string[];
  rewards: string[];
  milestoneRequired: string;
  locationId?: string;
}

/**
 * Convert a location name like "Frozen Heights" to a location ID like "frozen_heights".
 */
function toLocationId(name: string): string {
  return name
    .replace(/['']/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * Parse reward text from a table cell into an array of reward strings.
 * Handles formats like:
 *   "Item\nPower Bracer"
 *   "Pokemon\nBalloon Pikachu"
 *   "Effect\n+10% catch rate"
 *   "Electirizer, Power Weight, Gold Bottle Cap"
 */
function parseRewards(rewardText: string): string[] {
  // Remove type prefixes (Item, Pokemon, Effect) that appear on their own line
  const cleaned = rewardText
    .replace(/^(Item|Pokémon|Pokemon|Effect)\s*/gim, "")
    .trim();

  if (!cleaned) return [rewardText.trim()];

  // Split on commas, semicolons, or newlines, but keep compound items together
  return cleaned
    .split(/[,;]\s*|\n/)
    .map((r) => r.trim())
    .filter(Boolean);
}

export async function scrapeMissions(): Promise<void> {
  console.log("[missions] Fetching missions from unboundwiki.com...");

  const $ = await fetchAndParse("/missions/");

  const missions: Mission[] = [];

  // The page has two tables, separated by h2/h3 headings:
  // "Pre-Pokemon League Missions" and "Post-Pokemon League Missions"
  // Each table: thead with [Mission, Location, Description, Reward, Picture]
  // Each tbody tr has 5 td cells

  // Track which section we're in by finding all tables
  const tables = $("table");

  tables.each((tableIdx, table) => {
    // Determine section: first table = pre-league, second = post-league
    const isPostGame = tableIdx >= 1;
    const milestoneDefault = isPostGame ? "post_game" : "game_start";

    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 4) return;

        // Cell 0: Mission number and name -- "#001: A Hero's Journey"
        const missionText = cleanText(cells.eq(0).text());
        const missionMatch = missionText.match(/#(\d{3}):\s*(.+)/);
        if (!missionMatch) return;

        const number = missionMatch[1];
        const name = missionMatch[2].trim();
        const id = `mission_${number}`;

        // Cell 1: Location -- may have <br> separating area from sub-location
        const locationHtml = cells.eq(1).html() || "";
        const locationParts = locationHtml
          .split(/<br\s*\/?>/)
          .map((part) => {
            // Strip HTML tags and clean
            const text = part.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
            return text;
          })
          .filter(Boolean);
        const locationName = locationParts[0] || "";
        const locationId = locationName ? toLocationId(locationName) : undefined;

        // Cell 2: Description -- contains "Requirements: ..." and description text
        const descHtml = cells.eq(2).html() || "";
        const descParts = descHtml.split(/<br\s*\/?>/);

        let requirements = "None";
        let description = cleanText(cells.eq(2).text());

        if (descParts.length >= 1) {
          // First part should contain "Requirements: ..."
          const reqHtml = descParts[0];
          const reqText = reqHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

          if (reqText.match(/^Requirements?:/i)) {
            requirements = reqText.replace(/^Requirements?:\s*/i, "").trim();

            // Description is everything after the requirements line(s)
            // Skip empty <br> parts
            const descPartsFiltered = descParts
              .slice(1)
              .map((p) => p.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim())
              .filter(Boolean);
            description = descPartsFiltered.join(" ").trim();
          }
        }

        if (!requirements || requirements === "") requirements = "None";

        // Cell 3: Reward
        const rewardText = cleanText(cells.eq(3).text());
        const rewards = parseRewards(rewardText);

        // Create objectives from description (single item from list page)
        const objectives = description ? [description] : [];

        missions.push({
          id,
          name,
          description,
          requirements,
          objectives,
          rewards,
          milestoneRequired: milestoneDefault,
          locationId,
        });
      });
  });

  // Sort by mission number
  missions.sort((a, b) => {
    const numA = parseInt(a.id.replace("mission_", ""));
    const numB = parseInt(b.id.replace("mission_", ""));
    return numA - numB;
  });

  const dataDir = path.resolve(__dirname, "../../data");
  const outputPath = path.join(dataDir, "missions.json");

  await mkdir(dataDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(missions, null, 2), "utf-8");

  console.log(
    `[missions] Wrote ${missions.length} missions to ${outputPath}`
  );

  // Summary
  const preCount = missions.filter(
    (m) => m.milestoneRequired === "game_start"
  ).length;
  const postCount = missions.filter(
    (m) => m.milestoneRequired === "post_game"
  ).length;
  console.log(`[missions] Pre-league: ${preCount}, Post-league: ${postCount}`);
}

// Allow direct execution: npx tsx scripts/scrapers/missions.ts
if (require.main === module) {
  scrapeMissions().catch((err) => {
    console.error("[missions] Scraper failed:", err);
    process.exit(1);
  });
}
