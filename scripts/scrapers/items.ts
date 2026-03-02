/**
 * Items Stub Scraper for Pokemon Unbound Companion
 *
 * Outputs a manually curated list of important items across categories:
 * TMs, Mega Stones, Evolution Items, Key Items, and Held Items.
 *
 * Run with: npx tsx scripts/scrapers/items.ts
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";

interface Item {
  id: string;
  name: string;
  category:
    | "tm"
    | "mega-stone"
    | "z-crystal"
    | "zygarde-cell"
    | "key-item"
    | "berry"
    | "held-item"
    | "evolution-item";
  description: string;
  locationId?: string;
  locationName?: string;
  milestoneRequired: string;
  tmMove?: string;
  tmType?: string;
}

const items: Item[] = [
  // ---------------------------------------------------------------------------
  // TMs (TM01 - TM10)
  // ---------------------------------------------------------------------------
  {
    id: "tm01",
    name: "TM01 Work Up",
    category: "tm",
    description:
      "The user is roused, and its Attack and Sp. Atk stats increase.",
    locationId: "dehara_city",
    locationName: "Dehara City",
    milestoneRequired: "badge_1",
    tmMove: "Work Up",
    tmType: "Normal",
  },
  {
    id: "tm02",
    name: "TM02 Dragon Claw",
    category: "tm",
    description:
      "The user slashes the target with huge sharp claws.",
    locationId: "crystal_peak",
    locationName: "Crystal Peak",
    milestoneRequired: "badge_8",
    tmMove: "Dragon Claw",
    tmType: "Dragon",
  },
  {
    id: "tm03",
    name: "TM03 Psyshock",
    category: "tm",
    description:
      "An odd psychic wave is materialized and attacks the target. This attack does physical damage.",
    locationId: "seaport_city",
    locationName: "Seaport City",
    milestoneRequired: "badge_2",
    tmMove: "Psyshock",
    tmType: "Psychic",
  },
  {
    id: "tm04",
    name: "TM04 Calm Mind",
    category: "tm",
    description:
      "The user quietly focuses its mind and calms its spirit to raise its Sp. Atk and Sp. Def stats.",
    locationId: "serenity_isle",
    locationName: "Serenity Isle",
    milestoneRequired: "badge_5",
    tmMove: "Calm Mind",
    tmType: "Psychic",
  },
  {
    id: "tm05",
    name: "TM05 Roar",
    category: "tm",
    description:
      "The target is scared off, and a different Pokemon is dragged out.",
    locationId: "fallshore_city",
    locationName: "Fallshore City",
    milestoneRequired: "reach_fallshore",
    tmMove: "Roar",
    tmType: "Normal",
  },
  {
    id: "tm06",
    name: "TM06 Toxic",
    category: "tm",
    description:
      "A move that leaves the target badly poisoned. Its poison damage worsens every turn.",
    locationId: "vivpokemon_city",
    locationName: "Vivpokemon City",
    milestoneRequired: "badge_3",
    tmMove: "Toxic",
    tmType: "Poison",
  },
  {
    id: "tm07",
    name: "TM07 Hail",
    category: "tm",
    description:
      "The user summons a hailstorm lasting five turns. It damages all Pokemon except the Ice type.",
    locationId: "frozen_heights",
    locationName: "Frozen Heights",
    milestoneRequired: "badge_7",
    tmMove: "Hail",
    tmType: "Ice",
  },
  {
    id: "tm08",
    name: "TM08 Bulk Up",
    category: "tm",
    description:
      "The user tenses its muscles to bulk up its body, raising both its Attack and Defense stats.",
    locationId: "antler_city",
    locationName: "Antler City",
    milestoneRequired: "badge_4",
    tmMove: "Bulk Up",
    tmType: "Fighting",
  },
  {
    id: "tm09",
    name: "TM09 Venoshock",
    category: "tm",
    description:
      "The user drenches the target in a special poisonous liquid. Its power is doubled if the target is poisoned.",
    locationId: "dehara_city",
    locationName: "Dehara City",
    milestoneRequired: "badge_1",
    tmMove: "Venoshock",
    tmType: "Poison",
  },
  {
    id: "tm10",
    name: "TM10 Hidden Power",
    category: "tm",
    description:
      "A unique attack that varies in type depending on the Pokemon using it.",
    locationId: "fallshore_city",
    locationName: "Fallshore City",
    milestoneRequired: "game_start",
    tmMove: "Hidden Power",
    tmType: "Normal",
  },

  // ---------------------------------------------------------------------------
  // Mega Stones
  // ---------------------------------------------------------------------------
  {
    id: "charizardite_x",
    name: "Charizardite X",
    category: "mega-stone",
    description:
      "A Mega Stone that allows Charizard to Mega Evolve into Mega Charizard X.",
    locationId: "crater_town",
    locationName: "Crater Town",
    milestoneRequired: "badge_6",
  },
  {
    id: "blazikenite",
    name: "Blazikenite",
    category: "mega-stone",
    description:
      "A Mega Stone that allows Blaziken to Mega Evolve into Mega Blaziken.",
    locationId: "dehara_city",
    locationName: "Dehara City",
    milestoneRequired: "post_game",
  },
  {
    id: "gardevoirite",
    name: "Gardevoirite",
    category: "mega-stone",
    description:
      "A Mega Stone that allows Gardevoir to Mega Evolve into Mega Gardevoir.",
    locationId: "serenity_isle",
    locationName: "Serenity Isle",
    milestoneRequired: "badge_5",
  },
  {
    id: "gyaradosite",
    name: "Gyaradosite",
    category: "mega-stone",
    description:
      "A Mega Stone that allows Gyarados to Mega Evolve into Mega Gyarados.",
    locationId: "seaport_city",
    locationName: "Seaport City",
    milestoneRequired: "badge_4",
  },
  {
    id: "lucarionite",
    name: "Lucarionite",
    category: "mega-stone",
    description:
      "A Mega Stone that allows Lucario to Mega Evolve into Mega Lucario.",
    locationId: "antler_city",
    locationName: "Antler City",
    milestoneRequired: "badge_4",
  },

  // ---------------------------------------------------------------------------
  // Evolution Items
  // ---------------------------------------------------------------------------
  {
    id: "fire_stone",
    name: "Fire Stone",
    category: "evolution-item",
    description:
      "A peculiar stone that makes certain species of Pokemon evolve. It has a fiery orange heart.",
    locationId: "dehara_city",
    locationName: "Dehara City Mart",
    milestoneRequired: "badge_1",
  },
  {
    id: "water_stone",
    name: "Water Stone",
    category: "evolution-item",
    description:
      "A peculiar stone that makes certain species of Pokemon evolve. It is a clear, light blue.",
    locationId: "seaport_city",
    locationName: "Seaport City Mart",
    milestoneRequired: "badge_2",
  },
  {
    id: "thunder_stone",
    name: "Thunder Stone",
    category: "evolution-item",
    description:
      "A peculiar stone that makes certain species of Pokemon evolve. It has a thunderbolt pattern.",
    locationId: "antler_city",
    locationName: "Antler City Mart",
    milestoneRequired: "badge_4",
  },
  {
    id: "moon_stone",
    name: "Moon Stone",
    category: "evolution-item",
    description:
      "A peculiar stone that makes certain species of Pokemon evolve. It is as dark as the night sky.",
    locationId: "frozen_heights",
    locationName: "Frozen Heights Cave",
    milestoneRequired: "badge_3",
  },
  {
    id: "dusk_stone",
    name: "Dusk Stone",
    category: "evolution-item",
    description:
      "A peculiar stone that makes certain species of Pokemon evolve. It holds shadows as dark as can be.",
    locationId: "crater_town",
    locationName: "Crater Town Outskirts",
    milestoneRequired: "badge_6",
  },

  // ---------------------------------------------------------------------------
  // Key Items
  // ---------------------------------------------------------------------------
  {
    id: "bicycle",
    name: "Bicycle",
    category: "key-item",
    description:
      "A folding bicycle that allows for faster travel across the Borrius region.",
    locationId: "fallshore_city",
    locationName: "Fallshore City Bike Shop",
    milestoneRequired: "reach_fallshore",
  },
  {
    id: "old_rod",
    name: "Old Rod",
    category: "key-item",
    description:
      "An old and beat-up fishing rod. Use it by any body of water to fish for wild Pokemon.",
    locationId: "fallshore_city",
    locationName: "Fallshore City Docks",
    milestoneRequired: "reach_fallshore",
  },
  {
    id: "good_rod",
    name: "Good Rod",
    category: "key-item",
    description:
      "A decent fishing rod. Use it by any body of water to fish for somewhat rare Pokemon.",
    locationId: "seaport_city",
    locationName: "Seaport City Harbor",
    milestoneRequired: "badge_3",
  },
  {
    id: "super_rod",
    name: "Super Rod",
    category: "key-item",
    description:
      "An awesome fishing rod. Use it by any body of water to fish for rare Pokemon.",
    locationId: "crystal_peak",
    locationName: "Crystal Peak Lakeside",
    milestoneRequired: "badge_7",
  },
  {
    id: "exp_share",
    name: "Exp. Share",
    category: "key-item",
    description:
      "Turning on this special device will allow all the Pokemon on your team to receive Exp. Points from battles.",
    locationId: "dehara_city",
    locationName: "Dehara City Pokemon Lab",
    milestoneRequired: "badge_1",
  },

  // ---------------------------------------------------------------------------
  // Held Items
  // ---------------------------------------------------------------------------
  {
    id: "leftovers",
    name: "Leftovers",
    category: "held-item",
    description:
      "An item to be held by a Pokemon. The holder's HP is gradually restored during battle.",
    locationId: "antler_city",
    locationName: "Antler City Underground",
    milestoneRequired: "badge_4",
  },
  {
    id: "choice_band",
    name: "Choice Band",
    category: "held-item",
    description:
      "An item to be held by a Pokemon. This headband ups Attack but allows the use of only one move.",
    locationId: "crater_town",
    locationName: "Crater Town Battle Shop",
    milestoneRequired: "badge_6",
  },
  {
    id: "choice_specs",
    name: "Choice Specs",
    category: "held-item",
    description:
      "An item to be held by a Pokemon. These glasses boost Sp. Atk but allow the use of only one move.",
    locationId: "crater_town",
    locationName: "Crater Town Battle Shop",
    milestoneRequired: "badge_6",
  },
  {
    id: "life_orb",
    name: "Life Orb",
    category: "held-item",
    description:
      "An item to be held by a Pokemon. It boosts the power of moves but at the cost of some HP on each hit.",
    locationId: "crystal_peak",
    locationName: "Crystal Peak Summit",
    milestoneRequired: "badge_8",
  },
  {
    id: "focus_sash",
    name: "Focus Sash",
    category: "held-item",
    description:
      "An item to be held by a Pokemon. If it has full HP, the holder will endure one potential KO attack, leaving 1 HP.",
    locationId: "serenity_isle",
    locationName: "Serenity Isle Market",
    milestoneRequired: "badge_5",
  },
];

export async function scrapeItems(): Promise<void> {
  const dataDir = path.resolve(__dirname, "../../data");
  const outputPath = path.join(dataDir, "items.json");

  await mkdir(dataDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(items, null, 2), "utf-8");

  console.log(`[items] Wrote ${items.length} items to ${outputPath}`);
}

// Allow direct execution: npx tsx scripts/scrapers/items.ts
if (require.main === module) {
  scrapeItems().catch((err) => {
    console.error("[items] Scraper failed:", err);
    process.exit(1);
  });
}
