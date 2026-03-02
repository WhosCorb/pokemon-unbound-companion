"use client";

import type { NatureName } from "@/lib/types";
import { NATURES, STAT_LABELS } from "@/lib/constants";

interface NaturePickerProps {
  value?: NatureName;
  onChange: (nature: NatureName) => void;
}

export function NaturePicker({ value, onChange }: NaturePickerProps) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as NatureName)}
      className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                 px-2 py-1 rounded-sm outline-none focus:border-gba-cyan"
    >
      <option value="">-- Nature --</option>
      {NATURES.map((n) => {
        const label = n.increased && n.decreased
          ? `${n.name} (+${STAT_LABELS[n.increased]} / -${STAT_LABELS[n.decreased]})`
          : `${n.name} (Neutral)`;
        return (
          <option key={n.name} value={n.name}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
