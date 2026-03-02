import { notFound } from "next/navigation";
import Link from "next/link";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HpBar } from "@/components/ui/HpBar";
import { PageShell } from "@/components/layout/PageShell";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TYPE_COLORS } from "@/lib/constants";
import type { PokemonType, Pokemon, LearnsetMove } from "@/lib/types";
import { LearnsetTabs } from "./LearnsetTabs";
import { CaughtToggle } from "./CaughtToggle";
import pokemonData from "../../../../data/pokemon.json";

const allPokemon = pokemonData as Pokemon[];

export function generateStaticParams() {
  return allPokemon.map((p) => ({ id: p.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PokemonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pokemon = allPokemon.find((p) => p.id === id);

  if (!pokemon) {
    notFound();
  }

  const bst =
    pokemon.baseStats.hp +
    pokemon.baseStats.attack +
    pokemon.baseStats.defense +
    pokemon.baseStats.spAttack +
    pokemon.baseStats.spDefense +
    pokemon.baseStats.speed;

  const primaryColor = TYPE_COLORS[pokemon.types[0]] || "#888";

  const statEntries: { label: string; key: keyof typeof pokemon.baseStats; abbr: string }[] = [
    { label: "HP", key: "hp", abbr: "HP" },
    { label: "Attack", key: "attack", abbr: "ATK" },
    { label: "Defense", key: "defense", abbr: "DEF" },
    { label: "Sp. Atk", key: "spAttack", abbr: "SPA" },
    { label: "Sp. Def", key: "spDefense", abbr: "SPD" },
    { label: "Speed", key: "speed", abbr: "SPE" },
  ];

  // Group learnset by source
  const learnsetBySource: Record<string, LearnsetMove[]> = {
    "level-up": [],
    tm: [],
    tutor: [],
    egg: [],
  };
  for (const move of pokemon.learnset) {
    if (learnsetBySource[move.source]) {
      learnsetBySource[move.source].push(move);
    }
  }
  // Sort level-up by level
  learnsetBySource["level-up"].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  return (
    <PageShell>
      {/* Back link */}
      <Link
        href="/pokedex"
        className="inline-block font-pixel text-[8px] text-gba-text-dim hover:text-gba-cyan transition-colors"
      >
        &lt; BACK TO DEX
      </Link>

      {/* Caught toggle */}
      <div className="flex justify-end">
        <CaughtToggle pokemonId={pokemon.id} />
      </div>

      {/* ── Header ── */}
      <GbaPanel title={`#${pokemon.dexNumber.toString().padStart(3, "0")} ${pokemon.name.toUpperCase()}`}>
        <div className="flex items-center gap-4">
          {/* Sprite */}
          <div className="flex-shrink-0">
            <PokemonSprite
              dexNumber={pokemon.dexNumber}
              name={pokemon.name}
              primaryType={pokemon.types[0]}
              size="xl"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="font-pixel text-[11px] text-gba-text">
              {pokemon.name}
            </div>
            <div className="font-pixel text-[8px] text-gba-text-dim">
              #{pokemon.dexNumber.toString().padStart(3, "0")}
            </div>
            <div className="flex gap-1.5">
              {pokemon.types.map((t) => (
                <TypeBadge key={t} type={t} size="md" />
              ))}
            </div>
          </div>
        </div>
      </GbaPanel>

      {/* ── Base Stats ── */}
      <GbaPanel
        title="BASE STATS"
        headerColor="bg-gba-green/20 text-gba-green"
      >
        <div className="space-y-2">
          {statEntries.map(({ abbr, key }) => {
            const val = pokemon.baseStats[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-gba-text-dim w-7 text-right flex-shrink-0">
                  {abbr}
                </span>
                <span className="font-mono text-[10px] text-gba-text w-7 text-right flex-shrink-0">
                  {val}
                </span>
                <div className="flex-1">
                  <HpBar value={val} max={255} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1 border-t border-gba-border">
            <span className="font-pixel text-[7px] text-gba-text-dim w-7 text-right flex-shrink-0">
              BST
            </span>
            <span className="font-mono text-[10px] text-gba-green w-7 text-right flex-shrink-0">
              {bst}
            </span>
            <div className="flex-1">
              <HpBar value={bst} max={720} color="green" />
            </div>
          </div>
        </div>
      </GbaPanel>

      {/* ── Abilities ── */}
      <GbaPanel
        title="ABILITIES"
        headerColor="bg-gba-blue/20 text-gba-blue"
      >
        <div className="space-y-1.5">
          {pokemon.abilities.map((ability, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-mono text-xs text-gba-text">
                {ability.name}
              </span>
              {ability.isHidden && (
                <span className="font-pixel text-[7px] text-gba-yellow/80 border border-gba-yellow/40 px-1.5 py-0.5 rounded-sm">
                  HIDDEN
                </span>
              )}
            </div>
          ))}
          {pokemon.abilities.length === 0 && (
            <div className="font-mono text-xs text-gba-text-dim">
              No abilities data available
            </div>
          )}
        </div>
      </GbaPanel>

      {/* ── Evolution Chain ── */}
      <GbaPanel
        title="EVOLUTION"
        headerColor="bg-gba-yellow/20 text-gba-yellow"
      >
        {pokemon.evolutionChain.length > 0 ? (
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {pokemon.evolutionChain.map((stage, i) => {
              const isCurrent = stage.pokemonId === pokemon.id;
              return (
                <div key={stage.pokemonId} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && (
                    <div className="flex flex-col items-center px-1">
                      <span className="font-pixel text-[8px] text-gba-text-dim">
                        &gt;
                      </span>
                      <span className="font-pixel text-[6px] text-gba-text-dim leading-tight text-center max-w-[60px]">
                        {stage.method}
                      </span>
                    </div>
                  )}
                  <Link
                    href={`/pokedex/${stage.pokemonId}`}
                    className={`text-center px-2 py-1.5 rounded-sm border-2 transition-colors ${
                      isCurrent
                        ? "border-gba-yellow/60 bg-gba-yellow/10"
                        : "border-gba-border hover:border-gba-border-light"
                    }`}
                  >
                    <div
                      className={`font-pixel text-[8px] ${
                        isCurrent ? "text-gba-yellow" : "text-gba-text"
                      }`}
                    >
                      {stage.pokemonName}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="font-mono text-xs text-gba-text-dim">
            Does not evolve
          </div>
        )}
      </GbaPanel>

      {/* ── Learnset ── */}
      <LearnsetTabs learnsetBySource={learnsetBySource} />

      {/* ── Locations ── */}
      <GbaPanel
        title="LOCATIONS"
        headerColor="bg-gba-cyan/20 text-gba-cyan"
      >
        {pokemon.catchLocations.length > 0 ? (
          <div className="space-y-1.5">
            {pokemon.catchLocations.map((loc, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1 border-b border-gba-border/50 last:border-0"
              >
                <div>
                  <div className="font-mono text-xs text-gba-text">
                    {loc.locationName}
                  </div>
                  <div className="font-pixel text-[7px] text-gba-text-dim mt-0.5">
                    {loc.method.toUpperCase().replace(/-/g, " ")}
                  </div>
                </div>
                <div className="font-pixel text-[8px] text-gba-cyan flex-shrink-0">
                  {loc.rate}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-xs text-gba-text-dim">
            No wild encounters found
          </div>
        )}
      </GbaPanel>
    </PageShell>
  );
}
