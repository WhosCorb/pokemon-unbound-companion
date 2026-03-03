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
  return 10;
}

/**
 * Normalize location IDs to handle hyphen/underscore mismatch.
 * Converts hyphens to underscores for consistent matching.
 */
export function normalizeLocationId(id: string): string {
  return id.replace(/-/g, "_").toLowerCase();
}

/**
 * Find the parent location ID for a sub-location.
 * E.g., "auburn_waterway_a" -> "auburn_waterway" if "auburn_waterway" exists.
 */
function findParentLocationId(
  locationId: string,
  locationIds: Set<string>
): string | null {
  const parts = locationId.split("_");
  // Try progressively shorter prefixes (at least 2 parts)
  for (let len = parts.length - 1; len >= 2; len--) {
    const candidate = parts.slice(0, len).join("_");
    if (locationIds.has(candidate)) {
      return candidate;
    }
  }
  return null;
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
  const normalizedCurrent = normalizeLocationId(currentLocation);
  const resolvedCurrent = normalizedToId.get(normalizedCurrent) ?? currentLocation;

  // BFS
  const visited = new Set<string>();
  const queue: Array<{ id: string; hops: number }> = [];

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
      if (!visited.has(resolvedConn) && locationMap.has(resolvedConn)) {
        visited.add(resolvedConn);
        queue.push({ id: resolvedConn, hops: hops + 1 });
      }
    }
  }

  // Sub-location inference: orphaned locations inherit parent's hop count + 0.5
  for (const loc of locations) {
    if (result.has(loc.id)) continue;

    const parentId = findParentLocationId(loc.id, allLocationIds);
    if (parentId && result.has(parentId)) {
      const parentEntry = result.get(parentId)!;
      const subHops = parentEntry.hops + 0.5;
      result.set(loc.id, {
        hops: subHops,
        label: parentEntry.label,
        score: proximityScore(subHops),
      });
    }
  }

  return result;
}
