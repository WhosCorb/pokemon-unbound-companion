"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { PokemonType, TeamSlotMove, LearnsetMove } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";
import pokemonData from "../../../data/pokemon.json";

interface Pokemon {
  id: string;
  learnset: LearnsetMove[];
}

const allPokemon = pokemonData as Pokemon[];

interface MovePickerProps {
  isOpen: boolean;
  onClose: () => void;
  pokemonId: string;
  onSelect: (move: TeamSlotMove) => void;
  currentMoves: string[];
}

type SourceFilter = "all" | "level-up" | "tm" | "tutor" | "egg";

export function MovePicker({
  isOpen,
  onClose,
  pokemonId,
  onSelect,
  currentMoves,
}: MovePickerProps) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const pokemon = allPokemon.find((p) => p.id === pokemonId);
  const learnset = pokemon?.learnset ?? [];

  const filtered = useMemo(() => {
    let list = learnset;

    // Deduplicate by move name (keep first occurrence)
    const seen = new Set<string>();
    list = list.filter((m) => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });

    // Filter out already selected moves
    list = list.filter((m) => !currentMoves.includes(m.name));

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (sourceFilter !== "all") {
      list = list.filter((m) => m.source === sourceFilter);
    }

    return list;
  }, [learnset, search, sourceFilter, currentMoves]);

  function handleSelect(move: LearnsetMove) {
    onSelect({
      name: move.name,
      type: move.type,
      category: move.category,
      power: move.power,
      accuracy: move.accuracy,
    });
    setSearch("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    setSourceFilter("all");
    onClose();
  }

  const sources: { key: SourceFilter; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "level-up", label: "LVL" },
    { key: "tm", label: "TM" },
    { key: "tutor", label: "TUTOR" },
    { key: "egg", label: "EGG" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SELECT MOVE">
      <div className="space-y-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="SEARCH MOVES..."
        />

        {/* Source filter */}
        <div className="flex gap-1">
          {sources.map((s) => (
            <button
              key={s.key}
              onClick={() => setSourceFilter(s.key)}
              className={`flex-1 font-pixel text-[7px] py-1 border rounded-sm transition-colors ${
                sourceFilter === s.key
                  ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="font-pixel text-[7px] text-gba-text-dim">
          {filtered.length} MOVES
        </div>

        {/* Move list */}
        <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-1 px-1">
          {filtered.map((move, i) => (
            <button
              key={`${move.name}-${i}`}
              onClick={() => handleSelect(move)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-white/5 transition-colors text-left"
            >
              <TypeBadge type={move.type} abbreviated />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] text-gba-text truncate">
                  {move.name}
                </div>
                <div className="font-pixel text-[6px] text-gba-text-dim">
                  {move.category.toUpperCase()}
                  {move.power ? ` / PWR ${move.power}` : ""}
                  {move.accuracy ? ` / ACC ${move.accuracy}` : ""}
                </div>
              </div>
              {move.source === "level-up" && move.level != null && (
                <span className="font-pixel text-[6px] text-gba-text-dim flex-shrink-0">
                  Lv{move.level}
                </span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-6">
              <p className="font-pixel text-[8px] text-gba-text-dim">
                NO MOVES FOUND
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
