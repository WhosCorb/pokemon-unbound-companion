"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseSaveFile, speciesNameToAppId } from "@/lib/save-parser";
import type { ParsedSave } from "@/lib/save-parser";
import type { Pokemon } from "@/lib/types";
import { loadGameData } from "@/lib/data";
import {
  applySaveModifications,
  downloadSaveFile,
} from "@/lib/save-writer";
import type { PokemonEdits, SaveModification } from "@/lib/save-writer";
import { PlayerInfoBar } from "./PlayerInfoBar";
import { EditPanel } from "./EditPanel";
import { ChangesSummary } from "./ChangesSummary";

type EditorStatus =
  | { state: "idle" }
  | { state: "parsing" }
  | { state: "editing"; data: ParsedSave; pokemonDb: Pokemon[]; buffer: ArrayBuffer; filename: string }
  | { state: "error"; message: string };

function hasAnyChanges(e: PokemonEdits): boolean {
  return e.level !== undefined ||
    e.nature !== undefined ||
    e.gender !== undefined ||
    e.ivs !== undefined ||
    e.evs !== undefined ||
    e.moves !== undefined ||
    e.heldItem !== undefined ||
    e.friendship !== undefined;
}

export function SaveEditorPage() {
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
      if (hasAnyChanges(changes)) {
        mods.push({ slotIndex, changes });
      }
    });

    if (mods.length === 0) return;

    const { buffer, pokemonDb, filename } = status;

    const baseStatsLookup = (speciesId: number) => {
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

  const editCount = Array.from(edits.values()).filter(hasAnyChanges).length;

  return (
    <div className="space-y-3">
      {/* File input */}
      {(status.state === "idle" || status.state === "error") && (
        <div className="gba-panel p-3">
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
        <div className="gba-panel p-3">
          <p className="font-mono text-xs text-gba-text-dim animate-pulse">
            Parsing save file...
          </p>
        </div>
      )}

      {/* Editor */}
      {status.state === "editing" && (
        <div className="space-y-3">
          {/* Trainer header */}
          <div className="gba-panel p-3">
            <div className="flex items-center justify-between">
              <PlayerInfoBar
                player={status.data.player}
                money={status.data.money}
                coins={status.data.coins}
              />
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
          </div>

          {/* Party grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {status.data.party.map((mon, i) => {
              const appId = speciesNameToAppId(mon.species.name);
              const dbEntry = status.pokemonDb.find(p => p.id === appId);
              const isSelected = selectedSlot === i;
              const hasEdits = edits.has(i) && hasAnyChanges(edits.get(i)!);

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
          {selectedSlot !== null && (() => {
            const mon = status.data.party[selectedSlot];
            const appId = speciesNameToAppId(mon.species.name);
            const dbEntry = status.pokemonDb.find(p => p.id === appId);
            return (
              <EditPanel
                mon={mon}
                dbEntry={dbEntry}
                slotIndex={selectedSlot}
                currentEdits={edits.get(selectedSlot) ?? {}}
                onUpdate={updateEdit}
              />
            );
          })()}

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
