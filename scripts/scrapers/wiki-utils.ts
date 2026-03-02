/**
 * Wiki Scraper Utilities for Pokemon Unbound Companion
 *
 * Provides rate-limited fetching, HTML caching, and Cheerio parsing helpers
 * for scraping data from unboundwiki.com.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import * as cheerio from "cheerio";

const CACHE_DIR = join(__dirname, ".cache");
const RATE_LIMIT_MS = 1000; // 1 request per second
let lastRequestTime = 0;

/**
 * Ensure the cache directory exists.
 */
async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Generate a cache filename from a URL path.
 */
function cacheKeyFromPath(path: string): string {
  return path
    .replace(/^\//, "")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_") + ".html";
}

/**
 * Fetch a wiki page with rate limiting and caching.
 * @param path - The wiki page path (e.g., "/wiki/Gym_Leaders")
 * @param baseUrl - Base URL (defaults to unboundwiki.com)
 * @returns The HTML content of the page
 */
export async function fetchWikiPage(
  path: string,
  baseUrl = "https://unboundwiki.com"
): Promise<string> {
  await ensureCacheDir();

  const cacheFile = join(CACHE_DIR, cacheKeyFromPath(path));

  // Try cache first
  try {
    const cached = await readFile(cacheFile, "utf-8");
    if (cached.length > 0) {
      console.log(`  [cache hit] ${path}`);
      return cached;
    }
  } catch {
    // Cache miss, proceed with fetch
  }

  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const url = `${baseUrl}${path}`;
  console.log(`  [fetch] ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PokemonUnboundCompanion/1.0 (game-data-scraper)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Save to cache
  await writeFile(cacheFile, html, "utf-8");
  console.log(`  [cached] ${path}`);

  return html;
}

/**
 * Parse HTML into a Cheerio instance.
 */
export function parseHtml(html: string) {
  return cheerio.load(html);
}

/**
 * Fetch and parse a wiki page, returning a Cheerio instance.
 */
export async function fetchAndParse(
  path: string,
  baseUrl?: string
) {
  const html = await fetchWikiPage(path, baseUrl);
  return parseHtml(html);
}

/**
 * Extract text content from a Cheerio element, cleaned up.
 */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Clear the HTML cache.
 */
export async function clearCache(): Promise<void> {
  const { rm } = await import("fs/promises");
  try {
    await rm(CACHE_DIR, { recursive: true });
    await mkdir(CACHE_DIR, { recursive: true });
    console.log("[cache] Cleared");
  } catch {
    // Directory might not exist
  }
}
