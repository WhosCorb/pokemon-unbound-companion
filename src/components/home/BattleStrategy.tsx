"use client";

import { useMemo } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useProgress } from "@/hooks/useProgress";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TYPE_COLORS } from "@/lib/constants";
import { computeBattleStrategy, getNextEncounter } from "@/lib/recommendations";
import type { PokemonType, Pokemon, Trainer } from "@/lib/types";
import pokemonData from "../../../data/pokemon.json";
import trainersData from "../../../data/trainers.json";

const allPokemon = pokemonData as Pokemon[];
const trainers = trainersData as Trainer[];

const pokemonDexLookup = new Map<string, number>();
for (const p of allPokemon) {
  if (p.dexNumber > 0) {
    pokemonDexLookup.set(p.id, p.dexNumber);
  }
}

export function BattleStrategy() {
  const { filledSlots } = useTeam();
  const { completedMilestones, badgeCount, difficulty } = useProgress();

  const encounter = useMemo(
    () => getNextEncounter(trainers, completedMilestones, badgeCount, difficulty),
    [completedMilestones, badgeCount, difficulty]
  );

  const strategy = useMemo(() => {
    if (!encounter) return null;
    return computeBattleStrategy(
      encounter.trainer,
      encounter.team,
      filledSlots,
      allPokemon
    );
  }, [encounter, filledSlots]);

  if (filledSlots.length === 0) return null;

  if (!encounter || !strategy) {
    return (
      <GbaPanel title="BATTLE STRATEGY" headerColor="bg-gba-yellow/20 text-gba-yellow">
        <div className="text-center py-3">
          <div className="font-pixel text-[8px] text-gba-text-dim">
            No upcoming battles found.
          </div>
          <div className="font-mono text-[9px] text-gba-text-dim/60 mt-1">
            Mark progress milestones to see battle strategies.
          </div>
        </div>
      </GbaPanel>
    );
  }

  const { trainer, assignments, leadPokemon, notes } = strategy;

  return (
    <GbaPanel title="BATTLE STRATEGY" headerColor="bg-gba-yellow/20 text-gba-yellow">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="font-pixel text-[8px] text-gba-text">
            NEXT: {trainer.title.toUpperCase()} -- {trainer.name.toUpperCase()}
          </div>
          {trainer.specialtyType && (
            <TypeBadge type={trainer.specialtyType} />
          )}
        </div>

        {/* Lead recommendation */}
        <div className="flex items-center gap-1.5 bg-gba-cyan/5 border border-gba-cyan/20 px-2 py-1 rounded-sm">
          <span className="font-pixel text-[7px] text-gba-cyan flex-shrink-0">LEAD:</span>
          <PokemonSprite
            dexNumber={leadPokemon.dexNumber}
            name={leadPokemon.pokemonName}
            primaryType={leadPokemon.types[0]}
            size="sm"
          />
          <span className="font-mono text-[9px] text-gba-cyan">
            {leadPokemon.pokemonName}
          </span>
        </div>

        {/* Per-opponent assignments */}
        <div className="space-y-1.5">
          {assignments.map((a, i) => {
            const opponentDex = pokemonDexLookup.get(a.opponentPokemon.pokemonId);
            const counterDex = a.counterSlot.dexNumber;

            const effLabel =
              a.offenseMultiplier >= 2 ? "2x" :
              a.offenseMultiplier >= 1.5 ? "1.5x" :
              a.offenseMultiplier <= 0.5 ? "0.5x" :
              a.offenseMultiplier === 1 ? "1x" :
              `${a.offenseMultiplier}x`;

            const speedLabel =
              a.speedComparison === "faster" ? "FASTER" :
              a.speedComparison === "slower" ? "SLOWER" : "??";

            const speedColor =
              a.speedComparison === "faster" ? "text-gba-green" :
              a.speedComparison === "slower" ? "text-gba-red" :
              "text-gba-text-dim";

            return (
              <div
                key={`${a.opponentPokemon.pokemonId}-${i}`}
                className="bg-gba-bg/40 rounded-sm p-2 space-y-1"
              >
                {/* VS line: opponent -> counter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel text-[6px] text-gba-red flex-shrink-0">VS</span>
                  <PokemonSprite
                    dexNumber={opponentDex}
                    name={a.opponentPokemon.pokemonName}
                    primaryType={(a.opponentPokemon.types as PokemonType[])[0]}
                    size="sm"
                    className="w-4 h-4"
                  />
                  <div className="flex-shrink-0">
                    <span className="font-mono text-[8px] text-gba-text">
                      {a.opponentPokemon.pokemonName}
                    </span>
                    <span className="font-pixel text-[5px] text-gba-text-dim ml-1">
                      Lv{a.opponentPokemon.level}
                    </span>
                  </div>
                  <span className="font-pixel text-[6px] text-gba-text-dim mx-0.5">
                    &gt;
                  </span>
                  <PokemonSprite
                    dexNumber={counterDex}
                    name={a.counterSlot.pokemonName}
                    primaryType={a.counterSlot.types[0]}
                    size="sm"
                    className="w-4 h-4"
                  />
                  <span className="font-mono text-[8px] text-gba-cyan">
                    {a.counterSlot.pokemonName}
                  </span>
                </div>

                {/* Move + effectiveness + speed */}
                <div className="flex items-center gap-1 ml-5">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[a.moveType] }}
                  />
                  <span className="font-mono text-[8px] text-gba-text-dim">
                    {a.recommendedMove}
                  </span>
                  <span className={`font-pixel text-[6px] ${
                    a.offenseMultiplier >= 2 ? "text-gba-green" :
                    a.offenseMultiplier <= 0.5 ? "text-gba-red" :
                    "text-gba-text-dim"
                  }`}>
                    {effLabel}
                  </span>
                  <span className={`font-pixel text-[5px] ml-auto ${speedColor}`}>
                    {speedLabel}
                  </span>
                </div>

                {/* Dangerous moves warning */}
                {a.dangerousMoves.length > 0 && (
                  <div className="flex items-center gap-1 ml-5">
                    <span className="font-pixel text-[6px] text-gba-yellow flex-shrink-0">
                      WATCH:
                    </span>
                    <span className="font-mono text-[7px] text-gba-yellow/80">
                      {a.dangerousMoves.join(", ")}
                    </span>
                  </div>
                )}

                {/* Backup */}
                {a.backupSlot && (
                  <div className="flex items-center gap-1 ml-5">
                    <span className="font-pixel text-[5px] text-gba-text-dim/60 flex-shrink-0">
                      BACKUP:
                    </span>
                    <span className="font-mono text-[7px] text-gba-text-dim/60">
                      {a.backupSlot.pokemonName}
                      {a.backupMove && ` (${a.backupMove})`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {notes.length > 0 && (
          <div className="bg-gba-yellow/5 border border-gba-yellow/20 px-2 py-1.5 rounded-sm space-y-0.5">
            <div className="font-pixel text-[6px] text-gba-yellow">NOTES:</div>
            {notes.map((note, i) => (
              <div key={i} className="font-mono text-[8px] text-gba-yellow/80">
                {note}
              </div>
            ))}
          </div>
        )}
      </div>
    </GbaPanel>
  );
}
