"use client";

import { useState, useCallback } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { TeamSlot } from "@/components/team/TeamSlot";
import { PokemonSelector } from "@/components/team/PokemonSelector";
import { TypeCoverageGrid } from "@/components/team/TypeCoverageGrid";
import { CounterAnalysis } from "@/components/team/CounterAnalysis";
import { RecommendationsPanel } from "@/components/team/RecommendationsPanel";
import { useTeam } from "@/hooks/useTeam";
import { useCaught } from "@/hooks/useCaught";
import type { TeamSlot as TeamSlotType } from "@/lib/types";

export default function TeamPage() {
  const { slots, setSlot, removeSlot, updateSlot, teamTypes, clearTeam, filledSlots } =
    useTeam();
  const { markCaught } = useCaught();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  const handleSlotTap = useCallback((index: number) => {
    setActiveSlotIndex(index);
    setSelectorOpen(true);
  }, []);

  const handleSelect = useCallback(
    (slot: TeamSlotType) => {
      setSlot(activeSlotIndex, slot);
      markCaught(slot.pokemonId);
    },
    [activeSlotIndex, setSlot, markCaught]
  );

  const handleRemove = useCallback(
    (index: number) => {
      removeSlot(index);
    },
    [removeSlot]
  );

  return (
    <PageShell>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[10px] text-gba-text tracking-wider">
            TEAM PLANNER
          </h1>
          <p className="font-mono text-[10px] text-gba-text-dim mt-0.5">
            {filledSlots.length}/6 Pokemon
          </p>
        </div>
        {filledSlots.length > 0 && (
          <button
            onClick={clearTeam}
            className="font-pixel text-[7px] px-3 py-1.5 border border-gba-red/40 text-gba-red rounded-sm hover:bg-gba-red/10 transition-colors"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Team Slots */}
      <div className="space-y-2">
        {slots.map((slot, index) => (
          <TeamSlot
            key={index}
            slot={slot}
            index={index}
            onTap={() => handleSlotTap(index)}
            onRemove={() => handleRemove(index)}
            onUpdate={(updates) => updateSlot(index, updates)}
          />
        ))}
      </div>

      {/* Type Coverage Grid */}
      <TypeCoverageGrid teamTypes={teamTypes} />

      {/* Counter Analysis vs Next Gym */}
      <CounterAnalysis />

      {/* Recommendations */}
      <RecommendationsPanel />

      {/* Pokemon Selector Modal */}
      <PokemonSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelect}
      />
    </PageShell>
  );
}
