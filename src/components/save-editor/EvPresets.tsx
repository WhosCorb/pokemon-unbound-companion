"use client";

import type { BaseStats } from "@/lib/types";
import type { StatValues } from "@/lib/save-writer";

interface EvPresetsProps {
  baseStats: BaseStats | null;
  currentEvs: StatValues;
  onApply: (evs: StatValues) => void;
}

interface Preset {
  label: string;
  evs: StatValues;
}

function derivePresets(stats: BaseStats | null): Preset[] {
  if (!stats) {
    // Fallback presets when no base stats available
    return [
      { label: "ATK/SPE", evs: { hp: 0, atk: 252, def: 0, spd: 252, spAtk: 0, spDef: 6 } },
      { label: "SPA/SPE", evs: { hp: 0, atk: 0, def: 0, spd: 252, spAtk: 252, spDef: 6 } },
      { label: "BULK", evs: { hp: 252, atk: 0, def: 128, spd: 0, spAtk: 0, spDef: 128 } },
    ];
  }

  const isPhysical = stats.attack >= stats.spAttack;
  const isFast = stats.speed >= 80;
  const presets: Preset[] = [];

  if (isPhysical && isFast) {
    presets.push({ label: "ATK/SPE", evs: { hp: 6, atk: 252, def: 0, spd: 252, spAtk: 0, spDef: 0 } });
  } else if (isPhysical) {
    presets.push({ label: "ATK/HP", evs: { hp: 252, atk: 252, def: 6, spd: 0, spAtk: 0, spDef: 0 } });
  }

  if (!isPhysical && isFast) {
    presets.push({ label: "SPA/SPE", evs: { hp: 6, atk: 0, def: 0, spd: 252, spAtk: 252, spDef: 0 } });
  } else if (!isPhysical) {
    presets.push({ label: "SPA/HP", evs: { hp: 252, atk: 0, def: 0, spd: 0, spAtk: 252, spDef: 6 } });
  }

  // Add the opposite offensive preset if only one was added
  if (isPhysical && !presets.some(p => p.label.startsWith("SPA"))) {
    if (isFast) {
      presets.push({ label: "SPA/SPE", evs: { hp: 6, atk: 0, def: 0, spd: 252, spAtk: 252, spDef: 0 } });
    } else {
      presets.push({ label: "SPA/HP", evs: { hp: 252, atk: 0, def: 0, spd: 0, spAtk: 252, spDef: 6 } });
    }
  } else if (!isPhysical && !presets.some(p => p.label.startsWith("ATK"))) {
    if (isFast) {
      presets.push({ label: "ATK/SPE", evs: { hp: 6, atk: 252, def: 0, spd: 252, spAtk: 0, spDef: 0 } });
    } else {
      presets.push({ label: "ATK/HP", evs: { hp: 252, atk: 252, def: 6, spd: 0, spAtk: 0, spDef: 0 } });
    }
  }

  // Bulk preset: invest in weaker defensive stat
  const weakerDef = stats.defense <= stats.spDefense;
  presets.push({
    label: "BULK",
    evs: weakerDef
      ? { hp: 252, atk: 0, def: 252, spd: 0, spAtk: 0, spDef: 6 }
      : { hp: 252, atk: 0, def: 6, spd: 0, spAtk: 0, spDef: 252 },
  });

  return presets;
}

function evsMatch(a: StatValues, b: StatValues): boolean {
  return a.hp === b.hp && a.atk === b.atk && a.def === b.def &&
    a.spd === b.spd && a.spAtk === b.spAtk && a.spDef === b.spDef;
}

export function EvPresets({ baseStats, currentEvs, onApply }: EvPresetsProps) {
  const presets = derivePresets(baseStats);

  return (
    <div className="flex gap-1">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onApply(p.evs)}
          className={`font-pixel text-[7px] py-0.5 px-1.5 border rounded-sm transition-colors
            ${evsMatch(currentEvs, p.evs)
              ? "border-gba-cyan/60 bg-gba-cyan/10 text-gba-cyan"
              : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
