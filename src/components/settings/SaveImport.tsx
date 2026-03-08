"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseSaveFile, speciesNameToAppId } from "@/lib/save-parser";
import type { ParsedSave, SavePokemon } from "@/lib/save-parser";
import type { Pokemon, TeamSlot, TeamSlotMove, NatureName } from "@/lib/types";
import { useTeam } from "@/hooks/useTeam";
import { loadGameData } from "@/lib/data";

type ImportStatus =
  | { state: "idle" }
  | { state: "parsing" }
  | { state: "preview"; data: ParsedSave; pokemonDb: Pokemon[] }
  | { state: "imported"; count: number }
  | { state: "error"; message: string };

function formatPlayTime(pt: { hours: number; minutes: number; seconds: number }): string {
  return `${pt.hours}h ${pt.minutes}m ${pt.seconds}s`;
}

function mapSavePokemonToSlot(
  mon: SavePokemon,
  pokemonDb: Pokemon[]
): TeamSlot | null {
  const appId = speciesNameToAppId(mon.species.name);
  const dbEntry = pokemonDb.find((p) => p.id === appId);

  if (!dbEntry) return null;

  // Match moves against the Pokemon's learnset to get full move data
  const moveData: TeamSlotMove[] = [];
  const moveNames: string[] = [];

  for (const m of mon.moves) {
    const moveName = m.name;
    moveNames.push(moveName);

    // Try to find the move in the Pokemon's learnset for type/category info
    const learnsetEntry = dbEntry.learnset.find(
      (lm) => lm.name.toLowerCase() === moveName.toLowerCase()
    );
    if (learnsetEntry) {
      moveData.push({
        name: learnsetEntry.name,
        type: learnsetEntry.type,
        category: learnsetEntry.category,
        power: learnsetEntry.power,
        accuracy: learnsetEntry.accuracy,
      });
    } else {
      // Move not in learnset (TM/tutor/egg move not scraped) - include name only
      moveData.push({
        name: moveName,
        type: "normal",
        category: "physical",
        power: null,
        accuracy: null,
      });
    }
  }

  // Determine ability: check hidden ability flag, then pick from Pokemon's abilities
  let ability = dbEntry.abilities[0]?.name ?? "Unknown";
  if (mon.hasHiddenAbility) {
    const hidden = dbEntry.abilities.find((a) => a.isHidden);
    if (hidden) ability = hidden.name;
  }

  return {
    pokemonId: dbEntry.id,
    pokemonName: dbEntry.name,
    types: [...dbEntry.types],
    level: mon.level,
    moves: moveNames,
    ability,
    dexNumber: dbEntry.dexNumber,
    nature: mon.nature as NatureName,
    item: mon.heldItem?.name,
    moveData,
  };
}

export function SaveImport() {
  const { setSlot, clearTeam } = useTeam();
  const [status, setStatus] = useState<ImportStatus>({ state: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset file input when going back to idle
  useEffect(() => {
    if (status.state === "idle" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [status.state]);

  const handleFile = useCallback(async (file: File) => {
    setStatus({ state: "parsing" });

    try {
      // Validate file size (should be ~128KB, allow up to 256KB for safety)
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
      setStatus({ state: "preview", data, pokemonDb: gameData.pokemon });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse save file";
      setStatus({ state: "error", message });
    }
  }, []);

  const handleImport = useCallback(() => {
    if (status.state !== "preview") return;
    const { data, pokemonDb } = status;

    clearTeam();

    let imported = 0;
    for (let i = 0; i < data.party.length && i < 6; i++) {
      const slot = mapSavePokemonToSlot(data.party[i], pokemonDb);
      if (slot) {
        setSlot(i, slot);
        imported++;
      }
    }

    setStatus({ state: "imported", count: imported });
  }, [status, setSlot, clearTeam]);

  return (
    <div className="space-y-3">
      {/* File input */}
      {(status.state === "idle" || status.state === "error") && (
        <div>
          <label className="block font-mono text-xs text-gba-text-dim mb-2">
            Select your .sav or .srm file (128KB)
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

      {/* Preview */}
      {status.state === "preview" && (
        <div className="space-y-3">
          {/* Player info */}
          <div className="border-2 border-gba-border rounded-sm p-2 space-y-1">
            <div className="font-pixel text-[8px] text-gba-cyan">TRAINER</div>
            <div className="font-mono text-xs text-gba-text">
              {status.data.player.name}
              <span className="text-gba-text-dim ml-2">
                ({status.data.player.gender === "male" ? "M" : "F"})
              </span>
              <span className="text-gba-text-dim ml-2">
                ID: {status.data.player.trainerId}
              </span>
            </div>
            <div className="font-mono text-[10px] text-gba-text-dim">
              Play time: {formatPlayTime(status.data.player.playTime)}
            </div>
          </div>

          {/* Party preview */}
          <div className="border-2 border-gba-border rounded-sm p-2 space-y-1">
            <div className="font-pixel text-[8px] text-gba-cyan">
              PARTY ({status.data.party.length})
            </div>
            {status.data.party.map((mon, i) => {
              const appId = speciesNameToAppId(mon.species.name);
              const dbEntry = status.pokemonDb.find((p) => p.id === appId);
              const matched = !!dbEntry;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 py-0.5 ${
                    matched ? "" : "opacity-50"
                  }`}
                >
                  {dbEntry?.spriteUrl && (
                    <img
                      src={dbEntry.spriteUrl}
                      alt={mon.species.name}
                      className="w-6 h-6 pixelated"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-gba-text">
                      {dbEntry?.name ?? mon.species.name}
                    </span>
                    {mon.nickname !== mon.species.name && (
                      <span className="font-mono text-[10px] text-gba-text-dim ml-1">
                        &quot;{mon.nickname}&quot;
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-gba-text-dim">
                    Lv.{mon.level}
                  </span>
                  <span className="font-mono text-[10px] text-gba-text-dim">
                    {mon.nature}
                  </span>
                  {!matched && (
                    <span className="font-pixel text-[7px] text-gba-red">?</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="flex-1 font-pixel text-[8px] py-2 border-2 border-gba-green/40
                         text-gba-green rounded-sm hover:bg-gba-green/10 transition-colors"
            >
              IMPORT TEAM
            </button>
            <button
              onClick={() => setStatus({ state: "idle" })}
              className="font-pixel text-[8px] py-2 px-3 border-2 border-gba-border
                         text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Imported */}
      {status.state === "imported" && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-gba-green">
            Imported {status.count} Pokemon to your team.
          </p>
          <button
            onClick={() => setStatus({ state: "idle" })}
            className="font-pixel text-[8px] py-1.5 px-3 border-2 border-gba-border
                       text-gba-text-dim rounded-sm hover:border-gba-border-light transition-colors"
          >
            IMPORT ANOTHER
          </button>
        </div>
      )}
    </div>
  );
}
