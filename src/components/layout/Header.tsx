"use client";

import { useProgress } from "@/hooks/useProgress";
import { DIFFICULTY_LABELS } from "@/lib/constants";

export function Header() {
  const { currentLocation, difficulty, badgeCount } = useProgress();

  const locationLabel = currentLocation
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header className="bg-gba-panel border-b-3 border-gba-border px-3 py-2">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <span className="font-pixel text-[9px] text-gba-green tracking-wider">
          POKEMON UNBOUND
        </span>
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[7px] text-gba-blue border border-gba-blue/40 px-2 py-0.5 rounded-sm">
            {locationLabel}
          </span>
          <span className="font-pixel text-[7px] text-gba-yellow border border-gba-yellow/40 px-2 py-0.5 rounded-sm">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
          <span className="font-pixel text-[7px] text-gba-text-dim">
            B{badgeCount}/8
          </span>
        </div>
      </div>
    </header>
  );
}
