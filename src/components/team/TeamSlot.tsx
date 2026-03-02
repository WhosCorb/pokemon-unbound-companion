"use client";

import { useState } from "react";
import type {
  TeamSlot as TeamSlotType,
  PokemonType,
  NatureName,
  TeamSlotMove,
} from "@/lib/types";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { NaturePicker } from "./NaturePicker";
import { ItemPicker } from "./ItemPicker";
import { MovePicker } from "./MovePicker";
import { TYPE_COLORS } from "@/lib/constants";
import pokemonData from "../../../data/pokemon.json";

interface PokemonEntry {
  id: string;
  abilities: { name: string; isHidden: boolean }[];
}

const allPokemon = pokemonData as PokemonEntry[];

interface TeamSlotProps {
  slot: TeamSlotType | null;
  index: number;
  onTap: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<TeamSlotType>) => void;
}

export function TeamSlot({
  slot,
  index,
  onTap,
  onRemove,
  onUpdate,
}: TeamSlotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [editingMoveIndex, setEditingMoveIndex] = useState<number>(0);

  if (!slot) {
    return (
      <button
        onClick={onTap}
        className="w-full gba-panel p-3 flex items-center gap-3 hover:border-gba-border-light transition-colors group"
      >
        <div className="w-10 h-10 rounded-sm border-2 border-dashed border-gba-border flex items-center justify-center flex-shrink-0 group-hover:border-gba-border-light transition-colors">
          <span className="font-pixel text-[10px] text-gba-text-dim">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 text-left">
          <span className="font-pixel text-[7px] text-gba-text-dim tracking-wider">
            EMPTY -- TAP TO ADD
          </span>
        </div>
        <span className="font-pixel text-[10px] text-gba-cyan blink">
          &gt;
        </span>
      </button>
    );
  }

  const pokemon = allPokemon.find((p) => p.id === slot.pokemonId);
  const abilities = pokemon?.abilities ?? [];
  const moveNames = slot.moves ?? [];
  const moveData = slot.moveData ?? [];

  function handleOpenMovePicker(moveIndex: number) {
    setEditingMoveIndex(moveIndex);
    setMovePickerOpen(true);
  }

  function handleSelectMove(move: TeamSlotMove) {
    const newMoves = [...moveNames];
    const newMoveData = [...moveData];

    // Pad arrays to the editing index
    while (newMoves.length <= editingMoveIndex) newMoves.push("");
    while (newMoveData.length <= editingMoveIndex)
      newMoveData.push({
        name: "",
        type: "normal" as PokemonType,
        category: "status",
        power: null,
        accuracy: null,
      });

    newMoves[editingMoveIndex] = move.name;
    newMoveData[editingMoveIndex] = move;

    onUpdate({ moves: newMoves, moveData: newMoveData });
  }

  function handleRemoveMove(moveIndex: number) {
    const newMoves = moveNames.filter((_, i) => i !== moveIndex);
    const newMoveData = moveData.filter((_, i) => i !== moveIndex);
    onUpdate({ moves: newMoves, moveData: newMoveData });
  }

  // Compact view
  return (
    <div className="gba-panel group">
      {/* Header row - sprite, name, level, types, expand/collapse */}
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onTap}
          className="flex-shrink-0 hover:brightness-110 transition-all"
          title={`Change ${slot.pokemonName}`}
        >
          <PokemonSprite
            dexNumber={slot.dexNumber}
            name={slot.pokemonName}
            primaryType={slot.types[0]}
            size="lg"
          />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gba-text truncate">
              {slot.pokemonName}
            </span>
            <span className="font-pixel text-[7px] text-gba-text-dim flex-shrink-0">
              Lv{slot.level}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {slot.types.map((t) => (
              <TypeBadge key={t} type={t as PokemonType} abbreviated />
            ))}
            {slot.nature && (
              <span className="font-pixel text-[6px] text-gba-cyan ml-1">
                {slot.nature}
              </span>
            )}
            {slot.item && (
              <span className="font-pixel text-[6px] text-gba-text-dim ml-1 truncate max-w-[60px]">
                {slot.item}
              </span>
            )}
          </div>
          {/* Move summary dots */}
          {moveData.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {moveData.map((m, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[m.type] }}
                  />
                  <span className="font-mono text-[7px] text-gba-text-dim truncate max-w-[55px]">
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </button>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 flex items-center justify-center font-pixel text-[8px] text-gba-text-dim hover:text-gba-cyan rounded-sm transition-colors"
            title={isExpanded ? "Collapse" : "Edit details"}
          >
            {isExpanded ? "^" : "v"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-6 h-6 flex items-center justify-center font-pixel text-[8px] text-gba-red/60 hover:text-gba-red hover:bg-gba-red/10 rounded-sm transition-colors"
            title="Remove from team"
          >
            X
          </button>
        </div>
      </div>

      {/* Expanded edit section */}
      {isExpanded && (
        <div className="border-t border-gba-border px-3 pb-3 pt-2 space-y-2">
          {/* Level */}
          <div className="flex items-center gap-2">
            <label className="font-pixel text-[7px] text-gba-text-dim w-12 flex-shrink-0">
              LEVEL
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={slot.level}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 1 && v <= 100) onUpdate({ level: v });
              }}
              className="w-16 bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                         px-2 py-1 rounded-sm outline-none focus:border-gba-cyan"
            />
          </div>

          {/* Nature */}
          <div className="flex items-center gap-2">
            <label className="font-pixel text-[7px] text-gba-text-dim w-12 flex-shrink-0">
              NATURE
            </label>
            <div className="flex-1">
              <NaturePicker
                value={slot.nature}
                onChange={(nature: NatureName) => onUpdate({ nature })}
              />
            </div>
          </div>

          {/* Ability */}
          <div className="flex items-center gap-2">
            <label className="font-pixel text-[7px] text-gba-text-dim w-12 flex-shrink-0">
              ABILITY
            </label>
            <select
              value={slot.ability}
              onChange={(e) => onUpdate({ ability: e.target.value })}
              className="flex-1 bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                         px-2 py-1 rounded-sm outline-none focus:border-gba-cyan"
            >
              <option value="">-- Ability --</option>
              {abilities.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.isHidden ? " (Hidden)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Item */}
          <div className="flex items-center gap-2">
            <label className="font-pixel text-[7px] text-gba-text-dim w-12 flex-shrink-0">
              ITEM
            </label>
            <div className="flex-1">
              <ItemPicker
                value={slot.item}
                onChange={(item: string) => onUpdate({ item: item || undefined })}
              />
            </div>
          </div>

          {/* Moves */}
          <div>
            <label className="font-pixel text-[7px] text-gba-text-dim block mb-1">
              MOVES
            </label>
            <div className="space-y-1">
              {[0, 1, 2, 3].map((i) => {
                const move = moveData[i];
                return (
                  <div key={i} className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenMovePicker(i)}
                      className="flex-1 bg-gba-bg border-2 border-gba-border text-left px-2 py-1 rounded-sm
                                 hover:border-gba-border-light transition-colors flex items-center gap-1.5"
                    >
                      {move ? (
                        <>
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: TYPE_COLORS[move.type] }}
                          />
                          <span className="font-mono text-[10px] text-gba-text truncate">
                            {move.name}
                          </span>
                          <span className="font-pixel text-[6px] text-gba-text-dim ml-auto flex-shrink-0">
                            {move.category === "physical"
                              ? "PHY"
                              : move.category === "special"
                                ? "SPC"
                                : "STA"}
                            {move.power ? ` ${move.power}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="font-pixel text-[7px] text-gba-text-dim">
                          -- Move {i + 1} --
                        </span>
                      )}
                    </button>
                    {move && (
                      <button
                        onClick={() => handleRemoveMove(i)}
                        className="w-5 h-5 flex items-center justify-center font-pixel text-[7px] text-gba-red/60 hover:text-gba-red rounded-sm transition-colors flex-shrink-0"
                        title="Remove move"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Pokemon button */}
          <button
            onClick={onTap}
            className="w-full font-pixel text-[7px] py-1.5 border border-gba-border text-gba-text-dim rounded-sm
                       hover:border-gba-cyan hover:text-gba-cyan transition-colors mt-1"
          >
            CHANGE POKEMON
          </button>
        </div>
      )}

      {/* Move Picker Modal */}
      <MovePicker
        isOpen={movePickerOpen}
        onClose={() => setMovePickerOpen(false)}
        pokemonId={slot.pokemonId}
        onSelect={handleSelectMove}
        currentMoves={moveNames.filter(Boolean)}
      />
    </div>
  );
}
