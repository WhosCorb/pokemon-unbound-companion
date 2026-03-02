"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { BoxGrid } from "@/components/pc/BoxGrid";
import { PokemonSelector } from "@/components/team/PokemonSelector";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { Modal } from "@/components/ui/Modal";
import { usePc } from "@/hooks/usePc";
import { useCaught } from "@/hooks/useCaught";
import { useTeam } from "@/hooks/useTeam";
import type { TeamSlot, PcPokemon, PokemonType } from "@/lib/types";

export default function PcPage() {
  const {
    pc,
    activeBox,
    setActiveBox,
    addPokemon,
    removePokemon,
    renameBox,
    pokemonCount,
  } = usePc();
  const { markCaught } = useCaught();
  const { slots: teamSlots, setSlot: setTeamSlot } = useTeam();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [detailPokemon, setDetailPokemon] = useState<PcPokemon | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  function handleSlotTap(position: number) {
    const pokemon = activeBox.pokemon[position];
    if (pokemon) {
      setDetailPokemon(pokemon);
    } else {
      setSelectedPosition(position);
      setSelectorOpen(true);
    }
  }

  function handleSelectPokemon(slot: TeamSlot) {
    const pcPokemon: PcPokemon = {
      pokemonId: slot.pokemonId,
      pokemonName: slot.pokemonName,
      types: slot.types,
      dexNumber: slot.dexNumber,
      level: slot.level,
      ability: slot.ability,
      boxNumber: activeBox.number,
      boxPosition: selectedPosition,
    };
    addPokemon(activeBox.number, selectedPosition, pcPokemon);
    markCaught(slot.pokemonId);
  }

  function handleRelease() {
    if (!detailPokemon) return;
    removePokemon(detailPokemon.boxNumber, detailPokemon.boxPosition);
    setDetailPokemon(null);
  }

  function handleMoveToTeam() {
    if (!detailPokemon) return;
    // Find first empty team slot
    const emptyIndex = teamSlots.findIndex((s) => s === null);
    if (emptyIndex === -1) return; // Team full

    const teamSlot: TeamSlot = {
      pokemonId: detailPokemon.pokemonId,
      pokemonName: detailPokemon.pokemonName,
      types: detailPokemon.types,
      level: detailPokemon.level ?? 50,
      moves: detailPokemon.moves ?? [],
      ability: detailPokemon.ability ?? "",
      dexNumber: detailPokemon.dexNumber,
      nature: detailPokemon.nature,
    };

    setTeamSlot(emptyIndex, teamSlot);
    removePokemon(detailPokemon.boxNumber, detailPokemon.boxPosition);
    setDetailPokemon(null);
  }

  function handleStartRename() {
    setRenameValue(activeBox.name);
    setIsRenaming(true);
  }

  function handleFinishRename() {
    if (renameValue.trim()) {
      renameBox(activeBox.number, renameValue.trim());
    }
    setIsRenaming(false);
  }

  const teamFull = teamSlots.every((s) => s !== null);

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[10px] text-gba-text tracking-wider">
            PC BOX STORAGE
          </h1>
          <p className="font-mono text-[10px] text-gba-text-dim mt-0.5">
            {pokemonCount} Pokemon stored
          </p>
        </div>
      </div>

      {/* Box selector tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {pc.boxes.map((box) => (
          <button
            key={box.number}
            onClick={() => setActiveBox(box.number)}
            className={`flex-shrink-0 font-pixel text-[7px] px-3 py-1.5 border rounded-sm transition-colors ${
              pc.activeBox === box.number
                ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
            }`}
          >
            {box.name}
          </button>
        ))}
      </div>

      {/* Box name + rename */}
      <div className="flex items-center gap-2">
        {isRenaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFinishRename();
            }}
            className="flex-1 flex gap-1"
          >
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={16}
              autoFocus
              onBlur={handleFinishRename}
              className="flex-1 bg-gba-bg border-2 border-gba-cyan text-gba-text font-mono text-[10px]
                         px-2 py-1 rounded-sm outline-none"
            />
          </form>
        ) : (
          <>
            <h2 className="font-pixel text-[9px] text-gba-text tracking-wider">
              {activeBox.name.toUpperCase()}
            </h2>
            <button
              onClick={handleStartRename}
              className="font-pixel text-[6px] text-gba-text-dim hover:text-gba-cyan transition-colors"
            >
              RENAME
            </button>
          </>
        )}
        <span className="font-pixel text-[7px] text-gba-text-dim ml-auto">
          {activeBox.pokemon.filter(Boolean).length}/30
        </span>
      </div>

      {/* Box grid */}
      <BoxGrid box={activeBox} onSlotTap={handleSlotTap} />

      {/* Pokemon Selector */}
      <PokemonSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectPokemon}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detailPokemon !== null}
        onClose={() => setDetailPokemon(null)}
        title="POKEMON DETAILS"
      >
        {detailPokemon && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <PokemonSprite
                dexNumber={detailPokemon.dexNumber}
                name={detailPokemon.pokemonName}
                primaryType={detailPokemon.types[0]}
                size="lg"
              />
              <div>
                <div className="font-mono text-xs text-gba-text">
                  {detailPokemon.pokemonName}
                </div>
                {detailPokemon.nickname && (
                  <div className="font-pixel text-[7px] text-gba-text-dim">
                    &quot;{detailPokemon.nickname}&quot;
                  </div>
                )}
                <div className="flex gap-1 mt-1">
                  {detailPokemon.types.map((t) => (
                    <TypeBadge key={t} type={t as PokemonType} abbreviated />
                  ))}
                </div>
                {detailPokemon.level && (
                  <div className="font-pixel text-[7px] text-gba-text-dim mt-1">
                    Lv{detailPokemon.level}
                  </div>
                )}
                {detailPokemon.ability && (
                  <div className="font-pixel text-[7px] text-gba-text-dim">
                    {detailPokemon.ability}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMoveToTeam}
                disabled={teamFull}
                className={`flex-1 font-pixel text-[7px] py-2 border rounded-sm transition-colors ${
                  teamFull
                    ? "border-gba-border text-gba-text-dim/40 cursor-not-allowed"
                    : "border-gba-green text-gba-green hover:bg-gba-green/10"
                }`}
              >
                {teamFull ? "TEAM FULL" : "MOVE TO TEAM"}
              </button>
              <button
                onClick={handleRelease}
                className="flex-1 font-pixel text-[7px] py-2 border border-gba-red text-gba-red rounded-sm
                           hover:bg-gba-red/10 transition-colors"
              >
                RELEASE
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
