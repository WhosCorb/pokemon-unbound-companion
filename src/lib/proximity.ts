import type { Location } from "./types";

export interface ProximityEntry {
  hops: number;
  label: string;
  score: number;
}

const PROXIMITY_LABELS: Record<number, string> = {
  0: "HERE",
  1: "NEARBY",
  2: "2 AWAY",
  3: "3 AWAY",
};

function proximityLabel(hops: number): string {
  if (hops <= 3) return PROXIMITY_LABELS[Math.floor(hops)] ?? "ACCESSIBLE";
  if (hops <= 4) return `${Math.floor(hops)} AWAY`;
  return "ACCESSIBLE";
}

function proximityScore(hops: number): number {
  if (hops === 0) return 100;
  if (hops <= 1) return 75;
  if (hops <= 2) return 50;
  if (hops <= 3) return 25;
  if (hops <= 4) return 15;
  return 0;
}

/**
 * Normalize location IDs to handle hyphen/underscore mismatch.
 * Converts hyphens to underscores for consistent matching.
 */
export function normalizeLocationId(id: string): string {
  return id.replace(/-/g, "_").toLowerCase();
}

// Common abbreviations used in location IDs
const ID_EXPANSIONS: Record<string, string> = {
  mt: "mountain",
  rd: "road",
  pt: "point",
  ft: "fort",
};

/**
 * Normalize a location name for fuzzy prefix matching.
 * Expands abbreviations so "Thundercap Mt 1f" matches "Thundercap Mountain".
 */
function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => ID_EXPANSIONS[w] ?? w)
    .join(" ");
}

/**
 * Find the parent location ID for a sub-location.
 * Uses two strategies:
 * 1. ID prefix matching: "auburn_waterway_a" -> "auburn_waterway"
 * 2. Name prefix matching with abbreviation expansion: "Thundercap Mt 1f" -> "Thundercap Mountain"
 */
function findParentLocationId(
  location: Location,
  locationIds: Set<string>,
  locationsByName: Map<string, string>
): string | null {
  // Strategy 1: ID prefix matching
  const parts = location.id.split("_");
  for (let len = parts.length - 1; len >= 2; len--) {
    const candidate = parts.slice(0, len).join("_");
    if (locationIds.has(candidate)) {
      return candidate;
    }
  }

  // Strategy 2: Name-based matching with abbreviation expansion
  const normalizedName = normalizeNameForMatching(location.name);
  let bestMatch: string | null = null;
  let bestLen = 0;

  for (const [parentNormName, parentId] of locationsByName) {
    if (parentId === location.id) continue;
    if (
      normalizedName.startsWith(parentNormName + " ") &&
      parentNormName.length > bestLen
    ) {
      bestMatch = parentId;
      bestLen = parentNormName.length;
    }
  }

  return bestMatch;
}

/**
 * Compute a proximity map from the current location via BFS over connected locations.
 * Returns a map of locationId -> ProximityEntry.
 */
export function computeProximityMap(
  currentLocation: string,
  locations: Location[],
  maxHops = 4
): Map<string, ProximityEntry> {
  const result = new Map<string, ProximityEntry>();

  // Build lookup
  const locationMap = new Map<string, Location>();
  const normalizedToId = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
    normalizedToId.set(normalizeLocationId(loc.id), loc.id);
  }

  const allLocationIds = new Set(locationMap.keys());

  // Build name-based lookup for parent matching (normalized name -> id)
  const locationsByName = new Map<string, string>();
  for (const loc of locations) {
    const normName = normalizeNameForMatching(loc.name);
    // Only index locations that have connections (potential parents)
    if (loc.connectedLocations.length > 0) {
      locationsByName.set(normName, loc.id);
    }
  }

  const normalizedCurrent = normalizeLocationId(currentLocation);
  const resolvedCurrent = normalizedToId.get(normalizedCurrent) ?? currentLocation;

  // BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; hops: number }> = [];

  // Track "phantom parents": connection targets that don't exist in location data
  // but whose sub-locations might (e.g., route_1 -> icicle_cave, but only icicle_cave_1f exists)
  const phantomParents = new Map<string, number>(); // phantomId -> hops

  if (locationMap.has(resolvedCurrent)) {
    queue.push({ id: resolvedCurrent, hops: 0 });
    visited.add(resolvedCurrent);
  }

  while (queue.length > 0) {
    const { id, hops } = queue.shift()!;

    result.set(id, {
      hops,
      label: proximityLabel(hops),
      score: proximityScore(hops),
    });

    if (hops >= maxHops) continue;

    const loc = locationMap.get(id);
    if (!loc) continue;

    for (const connId of loc.connectedLocations) {
      const normalizedConn = normalizeLocationId(connId);
      const resolvedConn = normalizedToId.get(normalizedConn) ?? connId;
      if (visited.has(resolvedConn)) continue;
      visited.add(resolvedConn);

      if (locationMap.has(resolvedConn)) {
        queue.push({ id: resolvedConn, hops: hops + 1 });
      } else {
        // Phantom parent: referenced but doesn't exist in data
        const existing = phantomParents.get(resolvedConn);
        if (existing === undefined || hops + 1 < existing) {
          phantomParents.set(resolvedConn, hops + 1);
        }
      }
    }
  }

  // Sub-location inference: orphaned locations inherit parent's hop count + 0.5
  // Checks real parents (in result map) and phantom parents (referenced but missing)
  for (const loc of locations) {
    if (result.has(loc.id)) continue;

    // Strategy A: find a real parent via ID/name prefix
    const parentId = findParentLocationId(loc, allLocationIds, locationsByName);
    if (parentId && result.has(parentId)) {
      const parentEntry = result.get(parentId)!;
      const subHops = parentEntry.hops + 0.5;
      result.set(loc.id, {
        hops: subHops,
        label: parentEntry.label,
        score: proximityScore(subHops),
      });
      continue;
    }

    // Strategy B: match against phantom parents by ID prefix
    const parts = loc.id.split("_");
    let matched = false;
    for (let len = parts.length - 1; len >= 2 && !matched; len--) {
      const prefix = parts.slice(0, len).join("_");
      const phantomHops = phantomParents.get(prefix);
      if (phantomHops !== undefined) {
        const subHops = phantomHops + 0.5;
        result.set(loc.id, {
          hops: subHops,
          label: proximityLabel(phantomHops),
          score: proximityScore(subHops),
        });
        matched = true;
      }
    }
  }

  return result;
}
