"use client";

import { useState } from "react";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { MovePicker } from "@/components/team/MovePicker";
import type { SavePokemon } from "@/lib/save-parser";
import type { Pokemon, TeamSlotMove } from "@/lib/types";
import type { MoveRecommendation } from "@/lib/recommendations";
import { MOVE_NAME_TO_ID } from "@/lib/save-data/moves";

interface MoveSlot {
  id: number;
  name: string;
  pp: number;
}

interface MoveEditorProps {
  mon: SavePokemon;
  dbEntry: Pokemon | undefined;
  currentMoves: MoveSlot[];
  recommended: MoveRecommendation[];
  onChange: (moves: MoveSlot[]) => void;
}

export function MoveEditor({ mon, dbEntry, currentMoves, recommended, onChange }: MoveEditorProps) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  // Pad to 4 slots
  const slots: (MoveSlot | null)[] = [
    currentMoves[0] ?? null,
    currentMoves[1] ?? null,
    currentMoves[2] ?? null,
    currentMoves[3] ?? null,
  ];

  function handleMoveSelected(move: TeamSlotMove) {
    if (pickerSlot === null) return;
    const moveId = MOVE_NAME_TO_ID.get(move.name) ?? 0;
    // Get PP from learnset data
    const learnsetEntry = dbEntry?.learnset.find(m => m.name === move.name);
    const pp = learnsetEntry?.pp ?? 5;

    const newMoves = [...currentMoves];
    // Ensure array is long enough
    while (newMoves.length <= pickerSlot) {
      newMoves.push({ id: 0, name: "", pp: 0 });
    }
    newMoves[pickerSlot] = { id: moveId, name: move.name, pp };
    onChange(newMoves.filter(m => m.id > 0));
    setPickerSlot(null);
  }

  function handleClear(idx: number) {
    const newMoves = currentMoves.filter((_, i) => i !== idx);
    onChange(newMoves);
  }

  function handleUseRecommended(rec: MoveRecommendation) {
    const moveId = MOVE_NAME_TO_ID.get(rec.name) ?? 0;
    if (moveId === 0) return;
    const learnsetEntry = dbEntry?.learnset.find(m => m.name === rec.name);
    const pp = learnsetEntry?.pp ?? 5;

    // Replace the weakest slot or add if < 4
    const newMoves = [...currentMoves];
    if (newMoves.length < 4) {
      newMoves.push({ id: moveId, name: rec.name, pp });
    } else {
      // Replace last slot
      newMoves[3] = { id: moveId, name: rec.name, pp };
    }
    onChange(newMoves);
  }

  const pokemonId = dbEntry?.id ?? "";
  const currentMoveNames = currentMoves.map(m => m.name);

  return (
    <div>
      <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Moves</label>
      <div className="space-y-1">
        {slots.map((slot, i) => {
          // Enrich with type info from learnset
          const learnsetEntry = slot ? dbEntry?.learnset.find(m => m.name === slot.name) : null;
          return (
            <div key={i} className="flex items-center gap-1.5">
              {slot && slot.id > 0 ? (
                <>
                  {learnsetEntry && <TypeBadge type={learnsetEntry.type} abbreviated />}
                  <span className="font-mono text-[10px] text-gba-text flex-1 truncate">
                    {slot.name}
                  </span>
                  {learnsetEntry && (
                    <span className="font-pixel text-[6px] text-gba-text-dim">
                      {learnsetEntry.category.toUpperCase().slice(0, 4)}
                      {learnsetEntry.power ? ` ${learnsetEntry.power}` : ""}
                    </span>
                  )}
                  <button
                    onClick={() => setPickerSlot(i)}
                    className="font-pixel text-[6px] py-0.5 px-1 border border-gba-border
                               text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
                  >
                    CHANGE
                  </button>
                  <button
                    onClick={() => handleClear(i)}
                    className="font-pixel text-[6px] py-0.5 px-1 border border-gba-red/40
                               text-gba-red rounded-sm hover:bg-gba-red/10 transition-colors"
                  >
                    X
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPickerSlot(i)}
                  className="w-full font-mono text-[9px] text-gba-text-dim border border-dashed border-gba-border
                             py-1 rounded-sm hover:border-gba-border-light transition-colors text-center"
                >
                  + Add move
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommended moves */}
      {recommended.length > 0 && (
        <div className="mt-2">
          <label className="font-pixel text-[7px] text-gba-green block mb-1">RECOMMENDED</label>
          <div className="space-y-0.5">
            {recommended
              .filter(r => !currentMoveNames.includes(r.name))
              .slice(0, 4)
              .map((rec) => (
                <div key={rec.name} className="flex items-center gap-1.5">
                  <TypeBadge type={rec.type} abbreviated />
                  <span className="font-mono text-[9px] text-gba-text-dim flex-1 truncate">
                    {rec.name}
                  </span>
                  <span className="font-pixel text-[6px] text-gba-text-dim">
                    {rec.category.toUpperCase().slice(0, 4)}
                    {rec.power ? ` ${rec.power}` : ""}
                  </span>
                  <button
                    onClick={() => handleUseRecommended(rec)}
                    className="font-pixel text-[6px] py-0.5 px-1 border border-gba-green/40
                               text-gba-green rounded-sm hover:bg-gba-green/10 transition-colors"
                  >
                    USE
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Move picker modal */}
      {pickerSlot !== null && pokemonId && (
        <MovePicker
          isOpen={true}
          onClose={() => setPickerSlot(null)}
          pokemonId={pokemonId}
          onSelect={handleMoveSelected}
          currentMoves={currentMoveNames}
        />
      )}
    </div>
  );
}
