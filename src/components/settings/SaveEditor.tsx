"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseSaveFile, speciesNameToAppId, NATURE_NAMES } from "@/lib/save-parser";
import type { ParsedSave, SavePokemon } from "@/lib/save-parser";
import type { Pokemon, NatureName } from "@/lib/types";
import { NATURES, STAT_LABELS } from "@/lib/constants";
import { loadGameData } from "@/lib/data";
import {
  applySaveModifications,
  downloadSaveFile,
} from "@/lib/save-writer";
import type { PokemonEdits, SaveModification, StatValues } from "@/lib/save-writer";
import { SPECIES_DATA } from "@/lib/save-data/species-data";

// ── Types ───────────────────────────────────────────────

type EditorStatus =
  | { state: "idle" }
  | { state: "parsing" }
  | { state: "editing"; data: ParsedSave; pokemonDb: Pokemon[]; buffer: ArrayBuffer; filename: string }
  | { state: "error"; message: string };

const STAT_KEYS: (keyof StatValues)[] = ["hp", "atk", "def", "spAtk", "spDef", "spd"];
const STAT_DISPLAY: Record<keyof StatValues, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spAtk: "SpA",
  spDef: "SpD",
  spd: "Spe",
};

// ── Component ───────────────────────────────────────────

export function SaveEditor() {
  const [status, setStatus] = useState<EditorStatus>({ state: "idle" });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [edits, setEdits] = useState<Map<number, PokemonEdits>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status.state === "idle" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [status.state]);

  const handleFile = useCallback(async (file: File) => {
    setStatus({ state: "parsing" });
    setEdits(new Map());
    setSelectedSlot(null);

    try {
      if (file.size > 256 * 1024) {
        setStatus({ state: "error", message: `File too large: ${(file.size / 1024).toFixed(0)}KB (max 256KB)` });
        return;
      }

      const buffer = await file.arrayBuffer();
      const data = parseSaveFile(buffer);

      if (data.party.length === 0) {
        setStatus({ state: "error", message: "No Pokemon found in party" });
        return;
      }

      const gameData = await loadGameData();
      setStatus({
        state: "editing",
        data,
        pokemonDb: gameData.pokemon,
        buffer,
        filename: file.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse save file";
      setStatus({ state: "error", message });
    }
  }, []);

  const updateEdit = useCallback((slotIndex: number, partial: Partial<PokemonEdits>) => {
    setEdits(prev => {
      const next = new Map(prev);
      const existing = next.get(slotIndex) ?? {};
      next.set(slotIndex, { ...existing, ...partial });
      return next;
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (status.state !== "editing") return;

    const mods: SaveModification[] = [];
    edits.forEach((changes, slotIndex) => {
      const hasChanges = changes.level !== undefined ||
        changes.nature !== undefined ||
        changes.gender !== undefined ||
        changes.ivs !== undefined ||
        changes.evs !== undefined;
      if (hasChanges) {
        mods.push({ slotIndex, changes });
      }
    });

    if (mods.length === 0) return;

    const { buffer, pokemonDb, filename } = status;

    const baseStatsLookup = (speciesId: number) => {
      // Find the species name from SPECIES map, then look up in pokemonDb
      // We have the parsed party data, so we can cross-reference
      for (const mon of status.data.party) {
        if (mon.species.id === speciesId) {
          const appId = speciesNameToAppId(mon.species.name);
          const dbEntry = pokemonDb.find(p => p.id === appId);
          return dbEntry?.baseStats ?? null;
        }
      }
      return null;
    };

    const modified = applySaveModifications(buffer, mods, baseStatsLookup);
    const outName = filename.replace(/(\.\w+)$/, "_edited$1");
    downloadSaveFile(modified, outName);
  }, [status, edits]);

  const editCount = Array.from(edits.values()).filter(e =>
    e.level !== undefined || e.nature !== undefined || e.gender !== undefined ||
    e.ivs !== undefined || e.evs !== undefined
  ).length;

  // ── Render ──────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* File input */}
      {(status.state === "idle" || status.state === "error") && (
        <div>
          <label className="block font-mono text-xs text-gba-text-dim mb-2">
            Select your .sav or .srm file to edit Pokemon
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sav,.srm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="w-full font-mono text-xs text-gba-text file:mr-3 file:py-1.5 file:px-3
                       file:border-2 file:border-gba-border file:rounded-sm file:bg-gba-bg
                       file:text-gba-cyan file:font-pixel file:text-[8px] file:cursor-pointer
                       hover:file:border-gba-cyan file:transition-colors"
          />
          {status.state === "error" && (
            <p className="mt-2 font-mono text-xs text-gba-red">{status.message}</p>
          )}
        </div>
      )}

      {/* Parsing */}
      {status.state === "parsing" && (
        <p className="font-mono text-xs text-gba-text-dim animate-pulse">
          Parsing save file...
        </p>
      )}

      {/* Editor */}
      {status.state === "editing" && (
        <div className="space-y-3">
          {/* Trainer header */}
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-gba-text">
              {status.data.player.name}
              <span className="text-gba-text-dim ml-2">
                {status.data.player.badgeCount} badge{status.data.player.badgeCount !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => {
                setStatus({ state: "idle" });
                setEdits(new Map());
                setSelectedSlot(null);
              }}
              className="font-pixel text-[7px] py-1 px-2 border border-gba-border
                         text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
            >
              CLOSE
            </button>
          </div>

          {/* Party grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {status.data.party.map((mon, i) => {
              const appId = speciesNameToAppId(mon.species.name);
              const dbEntry = status.pokemonDb.find(p => p.id === appId);
              const isSelected = selectedSlot === i;
              const hasEdits = edits.has(i);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedSlot(isSelected ? null : i)}
                  className={`flex items-center gap-1.5 p-1.5 border-2 rounded-sm transition-colors text-left
                    ${isSelected
                      ? "border-gba-cyan bg-gba-cyan/10"
                      : hasEdits
                        ? "border-gba-yellow/40 bg-gba-yellow/5 hover:border-gba-yellow/60"
                        : "border-gba-border hover:border-gba-border-light"
                    }`}
                >
                  {dbEntry?.spriteUrl && (
                    <img src={dbEntry.spriteUrl} alt={mon.species.name} className="w-8 h-8 pixelated" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] text-gba-text truncate">
                      {dbEntry?.name ?? mon.species.name}
                    </div>
                    <div className="font-mono text-[8px] text-gba-text-dim">
                      Lv.{mon.level} {mon.nature}
                      {mon.gender !== "genderless" && (
                        <span className={mon.gender === "male" ? "text-blue-400 ml-1" : "text-pink-400 ml-1"}>
                          {mon.gender === "male" ? "M" : "F"}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasEdits && (
                    <span className="font-pixel text-[7px] text-gba-yellow">*</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Edit panel */}
          {selectedSlot !== null && (
            <EditPanel
              mon={status.data.party[selectedSlot]}
              slotIndex={selectedSlot}
              currentEdits={edits.get(selectedSlot) ?? {}}
              onUpdate={updateEdit}
            />
          )}

          {/* Download */}
          {editCount > 0 && (
            <div className="border-2 border-gba-green/30 rounded-sm p-2 space-y-2">
              <div className="font-pixel text-[8px] text-gba-green">
                {editCount} POKEMON MODIFIED
              </div>
              <ChangesSummary party={status.data.party} edits={edits} />
              <div className="space-y-1">
                <button
                  onClick={handleDownload}
                  className="w-full font-pixel text-[8px] py-2 border-2 border-gba-green/40
                           text-gba-green rounded-sm hover:bg-gba-green/10 transition-colors"
                >
                  DOWNLOAD MODIFIED SAVE
                </button>
                <p className="font-mono text-[9px] text-gba-text-dim text-center">
                  Changing nature or gender modifies PID, which may affect shininess/ability.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Edit Panel ──────────────────────────────────────────

function EditPanel({
  mon,
  slotIndex,
  currentEdits,
  onUpdate,
}: {
  mon: SavePokemon;
  slotIndex: number;
  currentEdits: PokemonEdits;
  onUpdate: (slotIndex: number, partial: Partial<PokemonEdits>) => void;
}) {
  const effectiveLevel = currentEdits.level ?? mon.level;
  const effectiveNatureIdx = currentEdits.nature ?? NATURE_NAMES.indexOf(mon.nature);
  const effectiveGender = currentEdits.gender ?? (mon.gender === "genderless" ? undefined : mon.gender);
  const effectiveIvs = currentEdits.ivs ?? mon.ivs;
  const effectiveEvs = currentEdits.evs ?? mon.evs;

  // Gender threshold for this species
  const speciesInfo = SPECIES_DATA.get(mon.species.id);
  const genderThreshold = speciesInfo?.[1] ?? 127;
  const canChangeGender = genderThreshold > 0 && genderThreshold < 254;

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
            return (
              <option key={n.name} value={i}>{label}</option>
            );
          })}
        </select>
        {currentEdits.nature !== undefined && currentEdits.nature !== NATURE_NAMES.indexOf(mon.nature) && (
          <p className="font-mono text-[8px] text-gba-yellow mt-1">
            PID will change -- may affect shininess/gender/ability
          </p>
        )}
      </div>

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
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate(slotIndex, {
                evs: { hp: 0, atk: 252, def: 0, spd: 252, spAtk: 0, spDef: 6 },
              })}
              className="font-pixel text-[7px] py-0.5 px-1.5 border border-gba-border
                         text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
            >
              ATK/SPE
            </button>
            <button
              onClick={() => onUpdate(slotIndex, {
                evs: { hp: 0, atk: 0, def: 0, spd: 252, spAtk: 252, spDef: 6 },
              })}
              className="font-pixel text-[7px] py-0.5 px-1.5 border border-gba-border
                         text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
            >
              SPA/SPE
            </button>
            <button
              onClick={() => onUpdate(slotIndex, {
                evs: { hp: 252, atk: 0, def: 128, spd: 0, spAtk: 0, spDef: 128 },
              })}
              className="font-pixel text-[7px] py-0.5 px-1.5 border border-gba-border
                         text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
            >
              BULK
            </button>
          </div>
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

      {/* Reset edits for this slot */}
      <button
        onClick={() => {
          onUpdate(slotIndex, { level: undefined, nature: undefined, gender: undefined, ivs: undefined, evs: undefined });
        }}
        className="font-pixel text-[7px] py-1 px-2 border border-gba-border
                   text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
      >
        RESET CHANGES
      </button>
    </div>
  );
}

// ── EV Total indicator ──────────────────────────────────

function EvTotal({ evs }: { evs: StatValues }) {
  const total = evs.hp + evs.atk + evs.def + evs.spd + evs.spAtk + evs.spDef;
  const over = total > 510;
  return (
    <div className={`font-mono text-[8px] mt-1 ${over ? "text-gba-red" : "text-gba-text-dim"}`}>
      Total: {total}/510{over ? " (over limit!)" : ""}
    </div>
  );
}

// ── Changes Summary ─────────────────────────────────────

function ChangesSummary({
  party,
  edits,
}: {
  party: SavePokemon[];
  edits: Map<number, PokemonEdits>;
}) {
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
