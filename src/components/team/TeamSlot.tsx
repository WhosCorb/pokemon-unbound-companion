"use client";

import type { TeamSlot as TeamSlotType, PokemonType } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";
import { TypeBadge } from "@/components/ui/TypeBadge";

interface TeamSlotProps {
  slot: TeamSlotType | null;
  index: number;
  onTap: () => void;
  onRemove: () => void;
}

export function TeamSlot({ slot, index, onTap, onRemove }: TeamSlotProps) {
  if (!slot) {
    return (
      <button
        onClick={onTap}
        className="w-full gba-panel p-3 flex items-center gap-3 hover:border-gba-border-light transition-colors group"
      >
        {/* Empty avatar placeholder */}
        <div className="w-10 h-10 rounded-sm border-2 border-dashed border-gba-border flex items-center justify-center flex-shrink-0 group-hover:border-gba-border-light transition-colors">
          <span className="font-pixel text-[10px] text-gba-text-dim">
            {index + 1}
          </span>
        </div>
        {/* Empty text */}
        <div className="flex-1 text-left">
          <span className="font-pixel text-[7px] text-gba-text-dim tracking-wider">
            EMPTY -- TAP TO ADD
          </span>
        </div>
        {/* Blinking cursor */}
        <span className="font-pixel text-[10px] text-gba-cyan blink">
          &gt;
        </span>
      </button>
    );
  }

  const primaryColor = TYPE_COLORS[slot.types[0] as PokemonType] || "#888";

  return (
    <div className="gba-panel flex items-center gap-3 p-3 group">
      {/* Pokemon avatar -- colored square with initial */}
      <button
        onClick={onTap}
        className="w-10 h-10 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-sm text-white shadow-inner hover:brightness-110 transition-all"
        style={{ backgroundColor: primaryColor }}
        title={`Edit ${slot.pokemonName}`}
      >
        {slot.pokemonName.charAt(0).toUpperCase()}
      </button>

      {/* Name, level, types */}
      <button onClick={onTap} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gba-text truncate">
            {slot.pokemonName}
          </span>
          <span className="font-pixel text-[7px] text-gba-text-dim flex-shrink-0">
            Lv{slot.level}
          </span>
        </div>
        <div className="flex gap-1 mt-1">
          {slot.types.map((t) => (
            <TypeBadge key={t} type={t as PokemonType} abbreviated />
          ))}
        </div>
      </button>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="w-6 h-6 flex items-center justify-center font-pixel text-[8px] text-gba-red/60 hover:text-gba-red hover:bg-gba-red/10 rounded-sm transition-colors flex-shrink-0"
        title="Remove from team"
      >
        X
      </button>
    </div>
  );
}
