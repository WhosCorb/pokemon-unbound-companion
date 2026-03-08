"use client";

import type { SavePokemon } from "@/lib/save-parser";
import { NATURE_NAMES } from "@/lib/save-parser";
import { MOVES } from "@/lib/save-data/moves";
import { ITEMS } from "@/lib/save-data/items";
import type { PokemonEdits, StatValues } from "@/lib/save-writer";

const STAT_KEYS: (keyof StatValues)[] = ["hp", "atk", "def", "spAtk", "spDef", "spd"];
const STAT_DISPLAY: Record<keyof StatValues, string> = {
  hp: "HP", atk: "Atk", def: "Def", spAtk: "SpA", spDef: "SpD", spd: "Spe",
};

interface ChangesSummaryProps {
  party: SavePokemon[];
  edits: Map<number, PokemonEdits>;
}

export function ChangesSummary({ party, edits }: ChangesSummaryProps) {
  const items: { name: string; changes: string[] }[] = [];

  edits.forEach((e, idx) => {
    const mon = party[idx];
    if (!mon) return;
    const changes: string[] = [];

    if (e.level !== undefined && e.level !== mon.level) {
      changes.push(`Lv.${mon.level} -> ${e.level}`);
    }
    if (e.gender !== undefined && e.gender !== mon.gender) {
      changes.push(`${mon.gender} -> ${e.gender}`);
    }
    if (e.nature !== undefined) {
      const oldNature = mon.nature;
      const newNature = NATURE_NAMES[e.nature];
      if (newNature && newNature !== oldNature) {
        changes.push(`${oldNature} -> ${newNature}`);
      }
    }
    if (e.ivs) {
      const diffs = STAT_KEYS.filter(k => e.ivs![k] !== mon.ivs[k]);
      if (diffs.length > 0) {
        if (diffs.length === 6 && STAT_KEYS.every(k => e.ivs![k] === 31)) {
          changes.push("IVs: all 31");
        } else {
          changes.push(`IVs: ${diffs.map(k => `${STAT_DISPLAY[k]}=${e.ivs![k]}`).join(", ")}`);
        }
      }
    }
    if (e.evs) {
      const diffs = STAT_KEYS.filter(k => e.evs![k] !== mon.evs[k]);
      if (diffs.length > 0) {
        changes.push(`EVs: ${STAT_KEYS.filter(k => e.evs![k] > 0).map(k => `${e.evs![k]} ${STAT_DISPLAY[k]}`).join(" / ")}`);
      }
    }
    if (e.moves) {
      const oldMoveNames = mon.moves.map(m => m.name);
      const newMoveNames = e.moves.map(m => MOVES.get(m.id) ?? `#${m.id}`);
      const added = newMoveNames.filter(n => !oldMoveNames.includes(n));
      const removed = oldMoveNames.filter(n => !newMoveNames.includes(n));
      if (added.length > 0 || removed.length > 0) {
        const parts: string[] = [];
        if (added.length > 0) parts.push(`+${added.join(", ")}`);
        if (removed.length > 0) parts.push(`-${removed.join(", ")}`);
        changes.push(`Moves: ${parts.join("; ")}`);
      }
    }
    if (e.heldItem !== undefined) {
      const oldName = mon.heldItem?.name ?? "None";
      const newName = e.heldItem === 0 ? "None" : (ITEMS.get(e.heldItem) ?? `#${e.heldItem}`);
      if (oldName !== newName) {
        changes.push(`Item: ${oldName} -> ${newName}`);
      }
    }
    if (e.friendship !== undefined && e.friendship !== mon.friendship) {
      changes.push(`Friendship: ${mon.friendship} -> ${e.friendship}`);
    }

    if (changes.length > 0) {
      items.push({ name: mon.nickname || mon.species.name, changes });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="font-mono text-[9px]">
          <span className="text-gba-text">{item.name}:</span>{" "}
          <span className="text-gba-text-dim">{item.changes.join("; ")}</span>
        </div>
      ))}
    </div>
  );
}
