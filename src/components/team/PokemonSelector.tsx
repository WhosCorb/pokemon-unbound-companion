"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { PokemonType, TeamSlot } from "@/lib/types";
import { TYPE_COLORS, ALL_TYPES } from "@/lib/constants";
import pokemonData from "../../../data/pokemon.json";

interface PokemonEntry {
  id: string;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  abilities: { name: string; isHidden: boolean }[];
}

const allPokemon: PokemonEntry[] = pokemonData as PokemonEntry[];

interface PokemonSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (slot: TeamSlot) => void;
}

export function PokemonSelector({
  isOpen,
  onClose,
  onSelect,
}: PokemonSelectorProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PokemonType | "">("");

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allPokemon.filter((p) => {
      // Name filter
      if (query && !p.name.toLowerCase().includes(query)) {
        return false;
      }
      // Type filter
      if (typeFilter && !p.types.includes(typeFilter)) {
        return false;
      }
      return true;
    });
  }, [search, typeFilter]);

  function getBst(p: PokemonEntry): number {
    const s = p.baseStats;
    return s.hp + s.attack + s.defense + s.spAttack + s.spDefense + s.speed;
  }

  function handleSelect(p: PokemonEntry) {
    const defaultAbility =
      p.abilities.find((a) => !a.isHidden)?.name ||
      p.abilities[0]?.name ||
      "";

    const slot: TeamSlot = {
      pokemonId: p.id,
      pokemonName: p.name,
      types: p.types as PokemonType[],
      level: 50,
      moves: [],
      ability: defaultAbility,
    };
    onSelect(slot);
    setSearch("");
    setTypeFilter("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    setTypeFilter("");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SELECT POKEMON">
      <div className="space-y-3">
        {/* Search input */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="SEARCH BY NAME..."
        />

        {/* Type filter row */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setTypeFilter("")}
            className={`font-pixel text-[6px] px-2 py-1 rounded-sm border transition-colors ${
              typeFilter === ""
                ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
            }`}
          >
            ALL
          </button>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t === typeFilter ? "" : t)}
              className={`font-pixel text-[6px] px-2 py-1 rounded-sm border transition-colors ${
                typeFilter === t
                  ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
              style={
                typeFilter === t
                  ? { borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] }
                  : {}
              }
            >
              {t.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div className="font-pixel text-[7px] text-gba-text-dim">
          {filtered.length} POKEMON FOUND
        </div>

        {/* Scrollable list */}
        <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-1 px-1">
          {filtered.map((p) => {
            const primaryColor =
              TYPE_COLORS[p.types[0] as PokemonType] || "#888";
            const bst = getBst(p);

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-white/5 transition-colors text-left group"
              >
                {/* Color indicator */}
                <div
                  className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-[8px] text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {p.name.charAt(0)}
                </div>

                {/* Name and types */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gba-text truncate group-hover:text-white transition-colors">
                    {p.name}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {p.types.map((t) => (
                      <TypeBadge
                        key={t}
                        type={t as PokemonType}
                        abbreviated
                      />
                    ))}
                  </div>
                </div>

                {/* BST */}
                <div className="text-right flex-shrink-0">
                  <div className="font-pixel text-[7px] text-gba-text-dim">
                    BST
                  </div>
                  <div className="font-mono text-xs text-gba-text">
                    {bst}
                  </div>
                </div>

                {/* Arrow */}
                <span className="font-pixel text-[8px] text-gba-text-dim group-hover:text-gba-cyan transition-colors">
                  &gt;
                </span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="font-pixel text-[8px] text-gba-text-dim">
                NO POKEMON FOUND
              </p>
              <p className="font-mono text-[10px] text-gba-text-dim mt-1">
                Try a different search term or type filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
