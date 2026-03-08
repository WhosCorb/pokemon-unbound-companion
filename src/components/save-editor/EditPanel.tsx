"use client";

import type { SavePokemon } from "@/lib/save-parser";
import { NATURE_NAMES } from "@/lib/save-parser";
import type { Pokemon } from "@/lib/types";
import { NATURES, STAT_LABELS } from "@/lib/constants";
import type { PokemonEdits, StatValues } from "@/lib/save-writer";
import { SPECIES_DATA } from "@/lib/save-data/species-data";
import { MOVES } from "@/lib/save-data/moves";
import { ITEMS } from "@/lib/save-data/items";
import { recommendNature } from "@/lib/recommendations";
import { recommendMoveset } from "@/lib/recommendations";
import { MoveEditor } from "./MoveEditor";
import { ItemEditor } from "./ItemEditor";
import { FriendshipEditor } from "./FriendshipEditor";
import { EvPresets } from "./EvPresets";

const STAT_KEYS: (keyof StatValues)[] = ["hp", "atk", "def", "spAtk", "spDef", "spd"];
const STAT_DISPLAY: Record<keyof StatValues, string> = {
  hp: "HP", atk: "Atk", def: "Def", spAtk: "SpA", spDef: "SpD", spd: "Spe",
};

interface EditPanelProps {
  mon: SavePokemon;
  dbEntry: Pokemon | undefined;
  slotIndex: number;
  currentEdits: PokemonEdits;
  onUpdate: (slotIndex: number, partial: Partial<PokemonEdits>) => void;
}

function EvTotal({ evs }: { evs: StatValues }) {
  const total = evs.hp + evs.atk + evs.def + evs.spd + evs.spAtk + evs.spDef;
  const over = total > 510;
  return (
    <div className={`font-mono text-[8px] mt-1 ${over ? "text-gba-red" : "text-gba-text-dim"}`}>
      Total: {total}/510{over ? " (over limit!)" : ""}
    </div>
  );
}

export function EditPanel({ mon, dbEntry, slotIndex, currentEdits, onUpdate }: EditPanelProps) {
  const effectiveLevel = currentEdits.level ?? mon.level;
  const effectiveNatureIdx = currentEdits.nature ?? NATURE_NAMES.indexOf(mon.nature);
  const effectiveGender = currentEdits.gender ?? (mon.gender === "genderless" ? undefined : mon.gender);
  const effectiveIvs = currentEdits.ivs ?? mon.ivs;
  const effectiveEvs = currentEdits.evs ?? mon.evs;
  const effectiveFriendship = currentEdits.friendship ?? mon.friendship;

  // Current moves: use edits if present, otherwise original
  const effectiveMoves = currentEdits.moves
    ? currentEdits.moves.map(m => ({ id: m.id, name: "", pp: m.pp }))
    : mon.moves.map(m => ({ id: m.id, name: m.name, pp: m.pp }));

  // Enrich move names from original data if we have edit-sourced moves
  if (currentEdits.moves) {
    for (const m of effectiveMoves) {
      if (!m.name && m.id > 0) {
        m.name = MOVES.get(m.id) ?? `Unknown (${m.id})`;
      }
    }
  }

  // Current held item
  const effectiveHeldItemName = (() => {
    if (currentEdits.heldItem !== undefined) {
      if (currentEdits.heldItem === 0) return null;
      return ITEMS.get(currentEdits.heldItem) ?? null;
    }
    return mon.heldItem?.name ?? null;
  })();

  // Gender threshold for this species
  const speciesInfo = SPECIES_DATA.get(mon.species.id);
  const genderThreshold = speciesInfo?.[1] ?? 127;
  const canChangeGender = genderThreshold > 0 && genderThreshold < 254;

  // Nature recommendation
  const natureRec = dbEntry ? recommendNature(dbEntry) : null;
  const natureRecIdx = natureRec ? NATURE_NAMES.indexOf(natureRec.name) : -1;
  const showNatureRec = natureRecIdx >= 0 && natureRecIdx !== effectiveNatureIdx;

  // Move recommendations
  const moveRecs = dbEntry ? recommendMoveset(dbEntry, effectiveLevel, [], []) : [];

  return (
    <div className="border-2 border-gba-cyan/30 rounded-sm p-2 space-y-3">
      <div className="font-pixel text-[8px] text-gba-cyan">
        EDIT: {mon.nickname || mon.species.name}
      </div>

      {/* Level */}
      <div>
        <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Level</label>
        <input
          type="number"
          min={1}
          max={100}
          value={effectiveLevel}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onUpdate(slotIndex, { level: Math.min(100, Math.max(1, v)) });
          }}
          className="w-20 bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-xs
                     px-2 py-1 rounded-sm outline-none focus:border-gba-cyan"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Gender</label>
        {canChangeGender ? (
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate(slotIndex, { gender: "male" })}
              className={`flex-1 font-pixel text-[8px] py-1 border-2 rounded-sm transition-colors
                ${effectiveGender === "male"
                  ? "border-blue-400/60 bg-blue-400/10 text-blue-400"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
                }`}
            >
              MALE
            </button>
            <button
              onClick={() => onUpdate(slotIndex, { gender: "female" })}
              className={`flex-1 font-pixel text-[8px] py-1 border-2 rounded-sm transition-colors
                ${effectiveGender === "female"
                  ? "border-pink-400/60 bg-pink-400/10 text-pink-400"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
                }`}
            >
              FEMALE
            </button>
          </div>
        ) : (
          <div className="font-mono text-[9px] text-gba-text-dim">
            {mon.gender === "genderless" ? "Genderless" : mon.gender === "male" ? "Male (fixed)" : "Female (fixed)"}
          </div>
        )}
        {currentEdits.gender !== undefined && currentEdits.gender !== mon.gender && (
          <p className="font-mono text-[8px] text-gba-yellow mt-1">
            PID will change -- may affect shininess/ability
          </p>
        )}
      </div>

      {/* Nature */}
      <div>
        <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Nature</label>
        <select
          value={effectiveNatureIdx}
          onChange={(e) => onUpdate(slotIndex, { nature: parseInt(e.target.value, 10) })}
          className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                     px-2 py-1 rounded-sm outline-none focus:border-gba-cyan"
        >
          {NATURES.map((n, i) => {
            const label = n.increased && n.decreased
              ? `${n.name} (+${STAT_LABELS[n.increased]} / -${STAT_LABELS[n.decreased]})`
              : `${n.name} (Neutral)`;
            return <option key={n.name} value={i}>{label}</option>;
          })}
        </select>
        {showNatureRec && natureRec && (
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[8px] text-gba-green">
              Recommended: {natureRec.name}
            </span>
            <button
              onClick={() => onUpdate(slotIndex, { nature: natureRecIdx })}
              className="font-pixel text-[6px] py-0.5 px-1 border border-gba-green/40
                         text-gba-green rounded-sm hover:bg-gba-green/10 transition-colors"
            >
              USE
            </button>
          </div>
        )}
        {currentEdits.nature !== undefined && currentEdits.nature !== NATURE_NAMES.indexOf(mon.nature) && (
          <p className="font-mono text-[8px] text-gba-yellow mt-1">
            PID will change -- may affect shininess/gender/ability
          </p>
        )}
      </div>

      {/* Moves */}
      <MoveEditor
        mon={mon}
        dbEntry={dbEntry}
        currentMoves={effectiveMoves.filter(m => m.id > 0)}
        recommended={moveRecs}
        onChange={(moves) => {
          onUpdate(slotIndex, {
            moves: moves.map(m => ({ id: m.id, pp: m.pp })),
          });
        }}
      />

      {/* Held Item */}
      <ItemEditor
        currentItemName={effectiveHeldItemName}
        onChange={(itemId, _itemName) => {
          onUpdate(slotIndex, { heldItem: itemId });
        }}
      />

      {/* Friendship */}
      <FriendshipEditor
        value={effectiveFriendship}
        onChange={(val) => onUpdate(slotIndex, { friendship: val })}
      />

      {/* IVs */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-mono text-[9px] text-gba-text-dim">IVs (0-31)</label>
          <button
            onClick={() => onUpdate(slotIndex, {
              ivs: { hp: 31, atk: 31, def: 31, spd: 31, spAtk: 31, spDef: 31 },
            })}
            className="font-pixel text-[7px] py-0.5 px-2 border border-gba-cyan/40
                       text-gba-cyan rounded-sm hover:bg-gba-cyan/10 transition-colors"
          >
            MAX ALL
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-1">
              <span className="font-mono text-[8px] text-gba-text-dim w-6">{STAT_DISPLAY[key]}</span>
              <input
                type="number"
                min={0}
                max={31}
                value={effectiveIvs[key]}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) {
                    onUpdate(slotIndex, {
                      ivs: { ...effectiveIvs, [key]: Math.min(31, Math.max(0, v)) },
                    });
                  }
                }}
                className="w-full bg-gba-bg border border-gba-border text-gba-text font-mono text-[10px]
                           px-1 py-0.5 rounded-sm outline-none focus:border-gba-cyan text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* EVs */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-mono text-[9px] text-gba-text-dim">
            EVs (0-252, max 510 total)
          </label>
          <EvPresets
            baseStats={dbEntry?.baseStats ?? null}
            currentEvs={effectiveEvs}
            onApply={(evs) => onUpdate(slotIndex, { evs })}
          />
        </div>
        <div className="grid grid-cols-3 gap-1">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-1">
              <span className="font-mono text-[8px] text-gba-text-dim w-6">{STAT_DISPLAY[key]}</span>
              <input
                type="number"
                min={0}
                max={252}
                value={effectiveEvs[key]}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) {
                    onUpdate(slotIndex, {
                      evs: { ...effectiveEvs, [key]: Math.min(252, Math.max(0, v)) },
                    });
                  }
                }}
                className="w-full bg-gba-bg border border-gba-border text-gba-text font-mono text-[10px]
                           px-1 py-0.5 rounded-sm outline-none focus:border-gba-cyan text-center"
              />
            </div>
          ))}
        </div>
        <EvTotal evs={effectiveEvs} />
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          onUpdate(slotIndex, {
            level: undefined, nature: undefined, gender: undefined,
            ivs: undefined, evs: undefined, moves: undefined,
            heldItem: undefined, friendship: undefined,
          });
        }}
        className="font-pixel text-[7px] py-1 px-2 border border-gba-border
                   text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
      >
        RESET CHANGES
      </button>
    </div>
  );
}
