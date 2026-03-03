"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import type { PokemonType, TeamSlot, TeamSlotMove, Pokemon } from "@/lib/types";
import { TYPE_COLORS, ALL_TYPES } from "@/lib/constants";
import { hasGenderDependentEvolution, recommendMoveset } from "@/lib/recommendations";
import pokemonData from "../../../data/pokemon.json";

interface PokemonEntry {
  id: string;
  dexNumber: number;
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
const allPokemonFull = pokemonData as Pokemon[];

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
  const [pendingGenderPokemon, setPendingGenderPokemon] =
    useState<PokemonEntry | null>(null);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allPokemon.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query)) {
        return false;
      }
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

  function createSlot(
    p: PokemonEntry,
    gender?: "male" | "female"
  ): TeamSlot {
    const defaultAbility =
      p.abilities.find((a) => !a.isHidden)?.name ||
      p.abilities[0]?.name ||
      "";

    const level = 50;
    let moves: string[] = [];
    let moveData: TeamSlotMove[] | undefined;

    const fullPokemon = allPokemonFull.find((fp) => fp.id === p.id);
    if (fullPokemon) {
      const recommended = recommendMoveset(fullPokemon, level, [], [], {
        levelUpOnly: true,
      });
      moves = recommended.map((m) => m.name);
      moveData = recommended.map((m) => ({
        name: m.name,
        type: m.type,
        category: m.category,
        power: m.power,
        accuracy: null,
      }));
    }

    return {
      pokemonId: p.id,
      pokemonName: p.name,
      types: p.types as PokemonType[],
      level,
      moves,
      ability: defaultAbility,
      dexNumber: p.dexNumber,
      moveData,
      ...(gender ? { gender } : {}),
    };
  }

  function handleSelect(p: PokemonEntry) {
    // Check if this Pokemon has gender-dependent evolutions
    const fullPokemon = allPokemonFull.find((fp) => fp.id === p.id);
    if (fullPokemon && hasGenderDependentEvolution(fullPokemon)) {
      setPendingGenderPokemon(p);
      return;
    }

    onSelect(createSlot(p));
    setSearch("");
    setTypeFilter("");
    onClose();
  }

  function handleGenderSelect(gender: "male" | "female") {
    if (!pendingGenderPokemon) return;
    onSelect(createSlot(pendingGenderPokemon, gender));
    setPendingGenderPokemon(null);
    setSearch("");
    setTypeFilter("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    setTypeFilter("");
    setPendingGenderPokemon(null);
    onClose();
  }

  // Gender selection sub-view
  if (pendingGenderPokemon) {
    const fullPokemon = allPokemonFull.find(
      (fp) => fp.id === pendingGenderPokemon.id
    );
    const evoChain = fullPokemon?.evolutionChain ?? [];

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="SELECT GENDER">
        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <PokemonSprite
              dexNumber={pendingGenderPokemon.dexNumber}
              name={pendingGenderPokemon.name}
              primaryType={pendingGenderPokemon.types[0]}
              size="lg"
            />
            <div>
              <div className="font-mono text-sm text-gba-text">
                {pendingGenderPokemon.name}
              </div>
              <div className="font-pixel text-[7px] text-gba-text-dim mt-1">
                This Pokemon has gender-dependent evolutions.
              </div>
            </div>
          </div>

          {/* Show evolution paths */}
          {evoChain.length > 0 && (
            <div className="bg-gba-bg/40 rounded-sm p-2">
              <div className="font-pixel text-[7px] text-gba-text-dim mb-1">
                EVOLUTION PATHS:
              </div>
              {evoChain
                .filter((e) => {
                  const m = e.method.toLowerCase();
                  return m.includes("male") || m.includes("female");
                })
                .map((e) => (
                  <div
                    key={e.pokemonId}
                    className="font-mono text-[9px] text-gba-text"
                  >
                    {e.pokemonName} -- {e.method}
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleGenderSelect("male")}
              className="flex-1 py-3 rounded-sm border border-blue-400/40 bg-blue-900/20 hover:bg-blue-900/40 transition-colors"
            >
              <div className="font-pixel text-[10px] text-blue-300">MALE</div>
            </button>
            <button
              onClick={() => handleGenderSelect("female")}
              className="flex-1 py-3 rounded-sm border border-pink-400/40 bg-pink-900/20 hover:bg-pink-900/40 transition-colors"
            >
              <div className="font-pixel text-[10px] text-pink-300">
                FEMALE
              </div>
            </button>
          </div>

          <button
            onClick={() => setPendingGenderPokemon(null)}
            className="w-full font-pixel text-[7px] text-gba-text-dim hover:text-gba-text py-1"
          >
            BACK TO LIST
          </button>
        </div>
      </Modal>
    );
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
                {/* Pokemon sprite */}
                <PokemonSprite
                  dexNumber={p.dexNumber}
                  name={p.name}
                  primaryType={p.types[0]}
                  size="md"
                />

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
