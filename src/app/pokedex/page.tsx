"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useProgress } from "@/hooks/useProgress";
import { PageShell } from "@/components/layout/PageShell";
import { SearchInput } from "@/components/ui/SearchInput";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { TYPE_COLORS, ALL_TYPES } from "@/lib/constants";
import type { PokemonType, Pokemon } from "@/lib/types";
import pokemonData from "../../../data/pokemon.json";

const allPokemon = pokemonData as Pokemon[];

type FilterMode = "available" | "all";

export default function PokedexPage() {
  const { isUnlocked } = useProgress();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonType | "all">("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const filtered = useMemo(() => {
    let list = allPokemon;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.dexNumber.toString().includes(q)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      list = list.filter((p) =>
        p.types.includes(typeFilter)
      );
    }

    // Availability filter
    if (filterMode === "available") {
      list = list.filter((p) => isUnlocked(p.milestoneRequired));
    }

    return list;
  }, [search, typeFilter, filterMode, isUnlocked]);

  return (
    <PageShell>
      {/* Header count */}
      <div className="font-pixel text-[10px] text-gba-text-dim text-center">
        {filtered.length} POKEMON
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="SEARCH NAME OR DEX #..."
      />

      {/* Availability toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setFilterMode("available")}
          className={`flex-1 font-pixel text-[8px] py-1.5 border-2 rounded-sm transition-colors ${
            filterMode === "available"
              ? "bg-gba-green/20 border-gba-green/60 text-gba-green"
              : "bg-gba-panel border-gba-border text-gba-text-dim hover:border-gba-border-light"
          }`}
        >
          AVAILABLE
        </button>
        <button
          onClick={() => setFilterMode("all")}
          className={`flex-1 font-pixel text-[8px] py-1.5 border-2 rounded-sm transition-colors ${
            filterMode === "all"
              ? "bg-gba-blue/20 border-gba-blue/60 text-gba-blue"
              : "bg-gba-panel border-gba-border text-gba-text-dim hover:border-gba-border-light"
          }`}
        >
          ALL
        </button>
      </div>

      {/* Type filter row */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setTypeFilter("all")}
          className={`font-pixel text-[7px] px-2 py-1 border rounded-sm transition-colors ${
            typeFilter === "all"
              ? "bg-gba-text/20 border-gba-text/60 text-gba-text"
              : "bg-gba-panel border-gba-border text-gba-text-dim"
          }`}
        >
          ALL
        </button>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t === typeFilter ? "all" : t)}
            className="font-pixel text-[7px] px-2 py-1 border rounded-sm transition-colors"
            style={{
              backgroundColor:
                typeFilter === t ? `${TYPE_COLORS[t]}33` : undefined,
              borderColor:
                typeFilter === t ? `${TYPE_COLORS[t]}88` : undefined,
              color: typeFilter === t ? TYPE_COLORS[t] : undefined,
            }}
          >
            {t.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Pokemon list */}
      <div className="space-y-1">
        {filtered.map((pokemon) => {
          const unlocked = isUnlocked(pokemon.milestoneRequired);
          const bst =
            pokemon.baseStats.hp +
            pokemon.baseStats.attack +
            pokemon.baseStats.defense +
            pokemon.baseStats.spAttack +
            pokemon.baseStats.spDefense +
            pokemon.baseStats.speed;
          const primaryColor =
            TYPE_COLORS[pokemon.types[0] as PokemonType] || "#888";

          return (
            <Link
              key={pokemon.id}
              href={`/pokedex/${pokemon.id}`}
              className={`block gba-panel transition-colors hover:border-gba-border-light ${
                !unlocked && filterMode === "all" ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center gap-2.5 p-2">
                {/* Colored dex number square */}
                <div
                  className="w-9 h-9 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-[8px] text-white/90"
                  style={{ backgroundColor: primaryColor }}
                >
                  #{pokemon.dexNumber.toString().padStart(3, "0")}
                </div>

                {/* Name + types */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gba-text truncate">
                    {pokemon.name}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {pokemon.types.map((t) => (
                      <TypeBadge key={t} type={t as PokemonType} abbreviated />
                    ))}
                  </div>
                </div>

                {/* BST + lock status */}
                <div className="flex-shrink-0 text-right">
                  {!unlocked && filterMode === "all" ? (
                    <span className="font-pixel text-[7px] text-gba-red/80">
                      LOCKED
                    </span>
                  ) : (
                    <span className="font-pixel text-[8px] text-gba-text-dim">
                      {bst}
                    </span>
                  )}
                  <div className="font-pixel text-[6px] text-gba-text-dim mt-0.5">
                    BST
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-8">
          <div className="font-pixel text-[9px] text-gba-text-dim">
            No Pokemon found.
          </div>
          <div className="font-mono text-[10px] text-gba-text-dim mt-2">
            Try adjusting your search or filters.
          </div>
        </div>
      )}
    </PageShell>
  );
}
