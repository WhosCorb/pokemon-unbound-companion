"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HpBar } from "@/components/ui/HpBar";
import { SearchInput } from "@/components/ui/SearchInput";
import { useProgress } from "@/hooks/useProgress";
import type { PokemonType } from "@/lib/types";
import locationsData from "../../../data/locations.json";
import pokemonData from "../../../data/pokemon.json";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface RawEncounter {
  pokemonId: string;
  pokemonName: string;
  types: string[];
  method: string;
  rate: number;
  levels: { min: number; max: number };
}

interface RawLocation {
  id: string;
  name: string;
  category: string;
  encounters: RawEncounter[];
  items: unknown[];
  trainers: unknown[];
  milestoneRequired: string;
  connectedLocations: string[];
}

interface MergedEncounter {
  pokemonId: string;
  pokemonName: string;
  types: PokemonType[];
  method: string;
  rate: number;
  levelMin: number;
  levelMax: number;
}

const locations = locationsData as RawLocation[];

// Build a lookup map: pokemonId -> types
const pokemonTypeMap = new Map<string, PokemonType[]>();
for (const p of pokemonData as { id: string; types: string[] }[]) {
  pokemonTypeMap.set(p.id, p.types as PokemonType[]);
}

// Readable labels for encounter methods
const METHOD_LABELS: Record<string, string> = {
  grass: "Grass",
  "grass-day": "Grass (Day)",
  "grass-night": "Grass (Night)",
  surf: "Surfing",
  fishing: "Fishing",
  "fishing-old": "Old Rod",
  "fishing-good": "Good Rod",
  "fishing-super": "Super Rod",
  headbutt: "Headbutt",
  "rock-smash": "Rock Smash",
  gift: "Gift",
  trade: "Trade",
  static: "Static",
  raid: "Raid",
};

// Display order for encounter methods (lower = shown first)
const METHOD_ORDER: Record<string, number> = {
  grass: 0,
  "grass-day": 1,
  "grass-night": 2,
  surf: 3,
  fishing: 4,
  "fishing-old": 5,
  "fishing-good": 6,
  "fishing-super": 7,
  "rock-smash": 8,
  headbutt: 9,
  gift: 10,
  trade: 11,
  static: 12,
  raid: 13,
};

// Category display config
const CATEGORY_CONFIG: Record<string, { label: string; order: number; color: string }> = {
  route: { label: "ROUTES", order: 0, color: "text-gba-green" },
  town: { label: "TOWNS", order: 1, color: "text-gba-blue" },
  dungeon: { label: "DUNGEONS", order: 2, color: "text-gba-red" },
  special: { label: "SPECIAL", order: 3, color: "text-gba-yellow" },
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  route: "bg-gba-green/20 text-gba-green border-gba-green/40",
  town: "bg-gba-blue/20 text-gba-blue border-gba-blue/40",
  dungeon: "bg-gba-red/20 text-gba-red border-gba-red/40",
  special: "bg-gba-yellow/20 text-gba-yellow border-gba-yellow/40",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypesForPokemon(pokemonId: string, encounterTypes: string[]): PokemonType[] {
  if (encounterTypes.length > 0) {
    return encounterTypes as PokemonType[];
  }
  return pokemonTypeMap.get(pokemonId) || [];
}

function mergeEncounters(encounters: RawEncounter[]): Map<string, MergedEncounter[]> {
  // Group by method, then merge duplicates (same pokemon + same method)
  const byMethod = new Map<string, Map<string, MergedEncounter>>();

  for (const enc of encounters) {
    if (!byMethod.has(enc.method)) {
      byMethod.set(enc.method, new Map());
    }
    const methodGroup = byMethod.get(enc.method)!;
    const existing = methodGroup.get(enc.pokemonId);

    if (existing) {
      existing.rate += enc.rate;
      existing.levelMin = Math.min(existing.levelMin, enc.levels.min);
      existing.levelMax = Math.max(existing.levelMax, enc.levels.max);
    } else {
      methodGroup.set(enc.pokemonId, {
        pokemonId: enc.pokemonId,
        pokemonName: enc.pokemonName,
        types: getTypesForPokemon(enc.pokemonId, enc.types),
        method: enc.method,
        rate: enc.rate,
        levelMin: enc.levels.min,
        levelMax: enc.levels.max,
      });
    }
  }

  // Convert to sorted arrays (highest rate first) and sort methods by display order
  const result = new Map<string, MergedEncounter[]>();
  const sortedMethods = [...byMethod.keys()].sort(
    (a, b) => (METHOD_ORDER[a] ?? 99) - (METHOD_ORDER[b] ?? 99)
  );

  for (const method of sortedMethods) {
    const group = [...byMethod.get(method)!.values()];
    group.sort((a, b) => b.rate - a.rate);
    result.set(method, group);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_BADGE_COLORS[category] || "bg-gba-text-dim/20 text-gba-text-dim border-gba-text-dim/40";
  return (
    <span
      className={`font-pixel text-[7px] px-2 py-0.5 border rounded-sm ${colors}`}
    >
      {category.toUpperCase()}
    </span>
  );
}

function EncounterRow({ encounter }: { encounter: MergedEncounter }) {
  const levelLabel =
    encounter.levelMin === encounter.levelMax
      ? `Lv${encounter.levelMin}`
      : `Lv${encounter.levelMin}-${encounter.levelMax}`;

  return (
    <div className="flex items-center gap-2 py-1 px-1">
      {/* Pokemon name */}
      <div className="flex-1 min-w-0">
        <span className="font-mono text-xs text-gba-text truncate block">
          {encounter.pokemonName}
        </span>
      </div>

      {/* Type badges */}
      <div className="flex gap-0.5 flex-shrink-0">
        {encounter.types.map((t) => (
          <TypeBadge key={t} type={t} abbreviated />
        ))}
      </div>

      {/* Encounter rate bar + percentage */}
      <div className="w-16 flex-shrink-0">
        <HpBar value={encounter.rate} max={100} color="cyan" />
      </div>
      <span className="font-pixel text-[7px] text-gba-text-dim w-8 text-right flex-shrink-0">
        {encounter.rate}%
      </span>

      {/* Level range */}
      <span className="font-pixel text-[7px] text-gba-text-dim w-14 text-right flex-shrink-0">
        {levelLabel}
      </span>
    </div>
  );
}

function EncounterTable({ encounters }: { encounters: RawEncounter[] }) {
  const grouped = useMemo(() => mergeEncounters(encounters), [encounters]);

  if (grouped.size === 0) {
    return (
      <div className="font-mono text-xs text-gba-text-dim py-4 text-center">
        No wild encounters at this location.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[...grouped.entries()].map(([method, encs]) => (
        <div key={method}>
          {/* Method sub-header */}
          <div className="font-pixel text-[8px] text-gba-cyan border-b border-gba-border/50 pb-1 mb-1 tracking-wider">
            {(METHOD_LABELS[method] || method).toUpperCase()}
          </div>
          <div className="space-y-0.5">
            {encs.map((enc) => (
              <EncounterRow key={enc.pokemonId} encounter={enc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LocationDetail({ location }: { location: RawLocation }) {
  return (
    <div className="space-y-3">
      {/* Location header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-pixel text-[10px] text-gba-text tracking-wider">
          {location.name.toUpperCase()}
        </h2>
        <CategoryBadge category={location.category} />
      </div>

      {/* Encounters panel */}
      <GbaPanel title="ENCOUNTERS" headerColor="bg-gba-green/20 text-gba-green">
        <EncounterTable encounters={location.encounters} />
      </GbaPanel>

      {/* Connected locations */}
      {location.connectedLocations.length > 0 && (
        <GbaPanel title="CONNECTED AREAS" headerColor="bg-gba-blue/20 text-gba-blue">
          <div className="flex flex-wrap gap-1.5">
            {location.connectedLocations.map((connId) => {
              const conn = locations.find((l) => l.id === connId);
              const label = conn
                ? conn.name
                : connId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <span
                  key={connId}
                  className="font-mono text-[10px] text-gba-cyan"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </GbaPanel>
      )}
    </div>
  );
}

function LocationListItem({
  location,
  isSelected,
  onSelect,
}: {
  location: RawLocation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const encounterCount = location.encounters.length;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-2 py-1.5 rounded-sm transition-colors flex items-center justify-between gap-2
        ${isSelected
          ? "bg-gba-cyan/10 border border-gba-cyan/30"
          : "hover:bg-gba-border/20 border border-transparent"
        }`}
    >
      <span
        className={`font-mono text-xs truncate ${
          isSelected ? "text-gba-cyan" : "text-gba-text"
        }`}
      >
        {location.name}
      </span>
      {encounterCount > 0 && (
        <span className="font-pixel text-[7px] text-gba-text-dim flex-shrink-0">
          {encounterCount}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LocationsPage() {
  const { currentLocation, setCurrentLocation } = useProgress();
  const [searchQuery, setSearchQuery] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  // Find the selected location, defaulting to user's current location
  const [selectedId, setSelectedId] = useState(currentLocation);

  // Keep selectedId in sync if currentLocation changes externally
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(currentLocation);
    }
  }, [currentLocation, selectedId]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) || locations[0],
    [selectedId]
  );

  // Filter locations by search query
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [searchQuery]);

  // Group filtered locations by category
  const groupedLocations = useMemo(() => {
    const groups = new Map<string, RawLocation[]>();
    for (const loc of filteredLocations) {
      const cat = loc.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(loc);
    }

    // Sort groups by display order, sort locations within groups alphabetically
    const sorted = [...groups.entries()]
      .sort(
        ([a], [b]) =>
          (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99)
      )
      .map(([cat, locs]) => ({
        category: cat,
        label: CATEGORY_CONFIG[cat]?.label || cat.toUpperCase(),
        color: CATEGORY_CONFIG[cat]?.color || "text-gba-text-dim",
        locations: locs.sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return sorted;
  }, [filteredLocations]);

  const handleSelectLocation = useCallback(
    (locationId: string) => {
      setSelectedId(locationId);
      setCurrentLocation(locationId);
      // Scroll to detail view
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    [setCurrentLocation]
  );

  return (
    <PageShell>
      {/* Page Header */}
      <div>
        <h1 className="font-pixel text-[10px] text-gba-text tracking-wider">
          LOCATION GUIDE
        </h1>
        <p className="font-mono text-[10px] text-gba-text-dim mt-0.5">
          {locations.length} locations
        </p>
      </div>

      {/* Current Location Selector */}
      <GbaPanel title="CURRENT LOCATION" headerColor="bg-gba-cyan/20 text-gba-cyan">
        <select
          value={selectedId}
          onChange={(e) => handleSelectLocation(e.target.value)}
          className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-xs
                     px-3 py-2 rounded-sm outline-none cursor-pointer
                     focus:border-gba-cyan transition-colors"
        >
          {locations
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
        </select>
      </GbaPanel>

      {/* Location Detail */}
      <div ref={detailRef}>
        <LocationDetail location={selectedLocation} />
      </div>

      {/* Search / Filter */}
      <div className="pt-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="SEARCH LOCATIONS..."
        />
      </div>

      {/* Location List grouped by category */}
      <GbaPanel title="ALL LOCATIONS" headerColor="bg-gba-green/20 text-gba-green">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groupedLocations.length === 0 && (
            <div className="font-mono text-xs text-gba-text-dim py-4 text-center">
              No locations match your search.
            </div>
          )}
          {groupedLocations.map(({ category, label, color, locations: locs }) => (
            <div key={category}>
              {/* Category header */}
              <div
                className={`font-pixel text-[8px] ${color} border-b border-gba-border/50 pb-1 mb-1 tracking-wider`}
              >
                {label} ({locs.length})
              </div>
              <div className="space-y-0.5">
                {locs.map((loc) => (
                  <LocationListItem
                    key={loc.id}
                    location={loc}
                    isSelected={loc.id === selectedId}
                    onSelect={() => handleSelectLocation(loc.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </GbaPanel>
    </PageShell>
  );
}
