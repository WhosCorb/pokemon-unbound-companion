"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseSaveFile, speciesNameToAppId } from "@/lib/save-parser";
import { inferProgress } from "@/lib/save-heuristics";
import type { ParsedSave, SavePokemon } from "@/lib/save-parser";
import type { SaveHeuristics } from "@/lib/save-heuristics";
import type { Pokemon, TeamSlot, TeamSlotMove, NatureName, PcPokemon } from "@/lib/types";
import { useTeam } from "@/hooks/useTeam";
import { usePc } from "@/hooks/usePc";
import { useCaught } from "@/hooks/useCaught";
import { useProgress } from "@/hooks/useProgress";
import { loadGameData } from "@/lib/data";
import progressionData from "../../../data/progression.json";

type ImportStatus =
  | { state: "idle" }
  | { state: "parsing" }
  | { state: "preview"; data: ParsedSave; pokemonDb: Pokemon[]; heuristics: SaveHeuristics }
  | { state: "imported"; summary: string }
  | { state: "error"; message: string };

type PreviewTab = "trainer" | "party" | "pc" | "progress";

interface ImportTargets {
  team: boolean;
  pc: boolean;
  caught: boolean;
  progress: boolean;
}

function formatPlayTime(pt: { hours: number; minutes: number; seconds: number }): string {
  return `${pt.hours}h ${pt.minutes}m ${pt.seconds}s`;
}

function mapSavePokemonToSlot(
  mon: SavePokemon,
  pokemonDb: Pokemon[],
): TeamSlot | null {
  const appId = speciesNameToAppId(mon.species.name);
  const dbEntry = pokemonDb.find((p) => p.id === appId);
  if (!dbEntry) return null;

  const moveData: TeamSlotMove[] = [];
  const moveNames: string[] = [];

  for (const m of mon.moves) {
    const moveName = m.name;
    moveNames.push(moveName);
    const learnsetEntry = dbEntry.learnset.find(
      (lm) => lm.name.toLowerCase() === moveName.toLowerCase(),
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
      moveData.push({
        name: moveName,
        type: "normal",
        category: "physical",
        power: null,
        accuracy: null,
      });
    }
  }

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

function mapSavePokemonToPc(
  mon: SavePokemon,
  pokemonDb: Pokemon[],
): Omit<PcPokemon, "boxNumber" | "boxPosition"> | null {
  const appId = speciesNameToAppId(mon.species.name);
  const dbEntry = pokemonDb.find((p) => p.id === appId);
  if (!dbEntry) return null;

  return {
    pokemonId: dbEntry.id,
    pokemonName: dbEntry.name,
    types: [...dbEntry.types],
    dexNumber: dbEntry.dexNumber,
    nickname: mon.nickname !== mon.species.name ? mon.nickname : undefined,
    level: mon.level,
    moves: mon.moves.map((m) => m.name),
    nature: mon.nature as NatureName,
  };
}

// ── Tab components ──────────────────────────────────────

function TrainerTab({ data }: { data: ParsedSave }) {
  const { player, warnings } = data;
  const badgeCount = countBits(player.badgeFlags);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-gba-text-dim">Name</span>
        <span className="text-gba-text">{player.name}</span>
        <span className="text-gba-text-dim">Gender</span>
        <span className="text-gba-text">{player.gender === "male" ? "Male" : "Female"}</span>
        <span className="text-gba-text-dim">Trainer ID</span>
        <span className="text-gba-text">{player.trainerId}</span>
        <span className="text-gba-text-dim">Play Time</span>
        <span className="text-gba-text">{formatPlayTime(player.playTime)}</span>
        <span className="text-gba-text-dim">Badges</span>
        <span className="text-gba-text">{badgeCount}</span>
      </div>
      {warnings.length > 0 && (
        <details className="mt-2">
          <summary className="font-mono text-[10px] text-gba-text-dim cursor-pointer">
            {warnings.length} parse warning{warnings.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-1 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i} className="font-mono text-[10px] text-gba-yellow/70">{w}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function PartyTab({ data, pokemonDb }: { data: ParsedSave; pokemonDb: Pokemon[] }) {
  return (
    <div className="space-y-1">
      {data.party.length === 0 && (
        <p className="font-mono text-xs text-gba-text-dim">No Pokemon in party</p>
      )}
      {data.party.map((mon, i) => (
        <PokemonRow key={i} mon={mon} pokemonDb={pokemonDb} />
      ))}
    </div>
  );
}

function PcTab({ data, pokemonDb }: { data: ParsedSave; pokemonDb: Pokemon[] }) {
  const [expandedBox, setExpandedBox] = useState<number | null>(null);
  const nonEmptyBoxes = data.pc
    .map((box, idx) => ({ box, idx }))
    .filter(({ box }) => box.pokemon.some(Boolean));
  const totalPcMons = data.pc.reduce(
    (sum, box) => sum + box.pokemon.filter(Boolean).length, 0,
  );

  if (totalPcMons === 0) {
    return <p className="font-mono text-xs text-gba-text-dim">No Pokemon in PC</p>;
  }

  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] text-gba-text-dim mb-1">
        {totalPcMons} Pokemon across {nonEmptyBoxes.length} box{nonEmptyBoxes.length !== 1 ? "es" : ""}
      </p>
      {nonEmptyBoxes.map(({ box, idx }) => {
        const count = box.pokemon.filter(Boolean).length;
        const isExpanded = expandedBox === idx;
        return (
          <div key={idx} className="border border-gba-border/50 rounded-sm">
            <button
              onClick={() => setExpandedBox(isExpanded ? null : idx)}
              className="w-full flex items-center justify-between px-2 py-1 hover:bg-gba-bg-light/30 transition-colors"
            >
              <span className="font-mono text-xs text-gba-text">{box.name}</span>
              <span className="font-mono text-[10px] text-gba-text-dim">{count}/30</span>
            </button>
            {isExpanded && (
              <div className="px-2 pb-1 space-y-0.5">
                {box.pokemon.map((mon, slotIdx) =>
                  mon ? (
                    <PokemonRow key={slotIdx} mon={mon} pokemonDb={pokemonDb} compact />
                  ) : null,
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressTab({ heuristics }: { heuristics: SaveHeuristics }) {
  const milestoneNames: Record<string, string> = {};
  for (const m of progressionData.milestones) {
    milestoneNames[m.id] = m.name;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-gba-text-dim">Confidence:</span>
        <span className={`font-pixel text-[8px] ${
          heuristics.confidence === "high"
            ? "text-gba-green"
            : heuristics.confidence === "medium"
              ? "text-gba-yellow"
              : "text-gba-red"
        }`}>
          {heuristics.confidence.toUpperCase()}
        </span>
      </div>
      <div className="space-y-0.5">
        {heuristics.suggestedMilestones.map((id) => (
          <div key={id} className="font-mono text-xs text-gba-text flex items-center gap-1.5">
            <span className="text-gba-green text-[10px]">*</span>
            {milestoneNames[id] ?? id}
          </div>
        ))}
      </div>
      {heuristics.confidence !== "high" && (
        <p className="font-mono text-[10px] text-gba-text-dim mt-1">
          Progress estimated from party levels. Review before importing.
        </p>
      )}
    </div>
  );
}

function PokemonRow({
  mon,
  pokemonDb,
  compact,
}: {
  mon: SavePokemon;
  pokemonDb: Pokemon[];
  compact?: boolean;
}) {
  const appId = speciesNameToAppId(mon.species.name);
  const dbEntry = pokemonDb.find((p) => p.id === appId);
  const matched = !!dbEntry;

  return (
    <div className={`flex items-center gap-2 py-0.5 ${matched ? "" : "opacity-50"}`}>
      {!compact && dbEntry?.spriteUrl && (
        <img src={dbEntry.spriteUrl} alt={mon.species.name} className="w-6 h-6 pixelated" />
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
      <span className="font-mono text-[10px] text-gba-text-dim">Lv.{mon.level}</span>
      {!compact && (
        <span className="font-mono text-[10px] text-gba-text-dim">{mon.nature}</span>
      )}
      {!matched && <span className="font-pixel text-[7px] text-gba-red">?</span>}
    </div>
  );
}

function countBits(n: number): number {
  let count = 0;
  let v = n;
  while (v) { count += v & 1; v >>>= 1; }
  return count;
}

// ── Main component ──────────────────────────────────────

export function SaveImport() {
  const { setSlot, clearTeam } = useTeam();
  const { addPokemon: addPcPokemon } = usePc();
  const { markCaught } = useCaught();
  const { toggleMilestone, completedMilestones } = useProgress();

  const [status, setStatus] = useState<ImportStatus>({ state: "idle" });
  const [activeTab, setActiveTab] = useState<PreviewTab>("trainer");
  const [targets, setTargets] = useState<ImportTargets>({
    team: true, pc: true, caught: true, progress: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status.state === "idle" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [status.state]);

  const handleFile = useCallback(async (file: File) => {
    setStatus({ state: "parsing" });
    try {
      if (file.size > 256 * 1024) {
        setStatus({ state: "error", message: `File too large: ${(file.size / 1024).toFixed(0)}KB (max 256KB)` });
        return;
      }

      const buffer = await file.arrayBuffer();
      const data = parseSaveFile(buffer);
      const gameData = await loadGameData();
      const heuristics = inferProgress(data.player, data.party, data.pc);

      setActiveTab("trainer");
      setTargets({ team: true, pc: true, caught: true, progress: true });
      setStatus({ state: "preview", data, pokemonDb: gameData.pokemon, heuristics });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse save file";
      setStatus({ state: "error", message });
    }
  }, []);

  const handleImport = useCallback(() => {
    if (status.state !== "preview") return;
    const { data, pokemonDb, heuristics } = status;
    const parts: string[] = [];

    if (targets.team && data.party.length > 0) {
      clearTeam();
      let count = 0;
      for (let i = 0; i < data.party.length && i < 6; i++) {
        const slot = mapSavePokemonToSlot(data.party[i], pokemonDb);
        if (slot) { setSlot(i, slot); count++; }
      }
      parts.push(`${count} party Pokemon`);
    }

    if (targets.pc) {
      let pcCount = 0;
      for (let boxIdx = 0; boxIdx < data.pc.length; boxIdx++) {
        const box = data.pc[boxIdx];
        for (let pos = 0; pos < box.pokemon.length; pos++) {
          const mon = box.pokemon[pos];
          if (!mon) continue;
          const pcMon = mapSavePokemonToPc(mon, pokemonDb);
          if (pcMon) {
            addPcPokemon(boxIdx, pos, { ...pcMon, boxNumber: boxIdx, boxPosition: pos });
            pcCount++;
          }
        }
      }
      if (pcCount > 0) parts.push(`${pcCount} PC Pokemon`);
    }

    if (targets.caught && data.caughtSpeciesIds.length > 0) {
      for (const id of data.caughtSpeciesIds) {
        markCaught(id);
      }
      parts.push(`${data.caughtSpeciesIds.length} caught species`);
    }

    if (targets.progress && heuristics.suggestedMilestones.length > 0) {
      let progressCount = 0;
      for (const milestoneId of heuristics.suggestedMilestones) {
        if (!completedMilestones.includes(milestoneId)) {
          toggleMilestone(milestoneId);
          progressCount++;
        }
      }
      if (progressCount > 0) parts.push(`${progressCount} milestones`);
    }

    const summary = parts.length > 0
      ? `Imported ${parts.join(", ")}.`
      : "Nothing to import with current selections.";
    setStatus({ state: "imported", summary });
  }, [status, targets, setSlot, clearTeam, addPcPokemon, markCaught, toggleMilestone, completedMilestones]);

  const toggleTarget = (key: keyof ImportTargets) => {
    setTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pcCount = status.state === "preview"
    ? status.data.pc.reduce((sum, box) => sum + box.pokemon.filter(Boolean).length, 0)
    : 0;
  const hasPc = pcCount > 0;
  const hasProgress = status.state === "preview" && status.heuristics.suggestedMilestones.length > 1;

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
          {/* Tabs */}
          <div className="flex border-b border-gba-border/50">
            {(
              [
                { id: "trainer", label: "TRAINER" },
                { id: "party", label: `PARTY (${status.data.party.length})` },
                { id: "pc", label: `PC${hasPc ? ` (${pcCount})` : ""}` },
                { id: "progress", label: "PROGRESS" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 font-pixel text-[7px] py-1.5 transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-gba-cyan text-gba-cyan"
                    : "border-transparent text-gba-text-dim hover:text-gba-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[80px]">
            {activeTab === "trainer" && <TrainerTab data={status.data} />}
            {activeTab === "party" && <PartyTab data={status.data} pokemonDb={status.pokemonDb} />}
            {activeTab === "pc" && <PcTab data={status.data} pokemonDb={status.pokemonDb} />}
            {activeTab === "progress" && <ProgressTab heuristics={status.heuristics} />}
          </div>

          {/* Import targets */}
          <div className="border-t border-gba-border/50 pt-2">
            <div className="font-pixel text-[8px] text-gba-text-dim mb-1.5">IMPORT</div>
            <div className="grid grid-cols-2 gap-1.5">
              <ImportCheckbox
                label={`Team (${status.data.party.length})`}
                checked={targets.team}
                onChange={() => toggleTarget("team")}
                disabled={status.data.party.length === 0}
              />
              <ImportCheckbox
                label={`PC (${pcCount})`}
                checked={targets.pc}
                onChange={() => toggleTarget("pc")}
                disabled={!hasPc}
              />
              <ImportCheckbox
                label={`Caught (${status.data.caughtSpeciesIds.length})`}
                checked={targets.caught}
                onChange={() => toggleTarget("caught")}
                disabled={status.data.caughtSpeciesIds.length === 0}
              />
              <ImportCheckbox
                label={`Progress (${status.heuristics.suggestedMilestones.length})`}
                checked={targets.progress}
                onChange={() => toggleTarget("progress")}
                disabled={!hasProgress}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!targets.team && !targets.pc && !targets.caught && !targets.progress}
              className="flex-1 font-pixel text-[8px] py-2 border-2 border-gba-green/40
                         text-gba-green rounded-sm hover:bg-gba-green/10 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              IMPORT SELECTED
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
          <p className="font-mono text-xs text-gba-green">{status.summary}</p>
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

function ImportCheckbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-1.5 cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        onChange={onChange}
        disabled={disabled}
        className="w-3 h-3 accent-gba-cyan"
      />
      <span className="font-mono text-[10px] text-gba-text">{label}</span>
    </label>
  );
}
