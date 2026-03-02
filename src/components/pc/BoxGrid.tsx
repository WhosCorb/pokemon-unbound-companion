"use client";

import type { PcBox } from "@/lib/types";
import { PcSlot } from "./PcSlot";

interface BoxGridProps {
  box: PcBox;
  onSlotTap: (position: number) => void;
}

export function BoxGrid({ box, onSlotTap }: BoxGridProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {box.pokemon.map((pokemon, i) => (
        <PcSlot
          key={i}
          pokemon={pokemon}
          position={i}
          onTap={() => onSlotTap(i)}
        />
      ))}
    </div>
  );
}
