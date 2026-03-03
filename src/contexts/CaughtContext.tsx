"use client";

import { createContext, useCallback, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import type { CaughtEntry } from "@/lib/types";

interface CaughtContextValue {
  caught: CaughtEntry[];
  markCaught: (pokemonId: string) => void;
  unmarkCaught: (pokemonId: string) => void;
  isCaught: (pokemonId: string) => boolean;
  caughtCount: number;
  caughtIds: Set<string>;
}

export const CaughtContext = createContext<CaughtContextValue | null>(null);

export function CaughtProvider({ children }: { children: React.ReactNode }) {
  const [caught, setCaught] = useStorage<CaughtEntry[]>(
    "pkm-unbound-caught",
    []
  );

  const caughtIds = useMemo(
    () => new Set(caught.map((c) => c.pokemonId)),
    [caught]
  );

  const markCaught = useCallback(
    (pokemonId: string) => {
      setCaught((prev) => {
        if (prev.some((c) => c.pokemonId === pokemonId)) return prev;
        return [...prev, { pokemonId, caughtAt: new Date().toISOString() }];
      });
    },
    [setCaught]
  );

  const unmarkCaught = useCallback(
    (pokemonId: string) => {
      setCaught((prev) => prev.filter((c) => c.pokemonId !== pokemonId));
    },
    [setCaught]
  );

  const isCaught = useCallback(
    (pokemonId: string) => caughtIds.has(pokemonId),
    [caughtIds]
  );

  const value = useMemo(
    (): CaughtContextValue => ({
      caught,
      markCaught,
      unmarkCaught,
      isCaught,
      caughtCount: caught.length,
      caughtIds,
    }),
    [caught, markCaught, unmarkCaught, isCaught, caughtIds]
  );

  return (
    <CaughtContext.Provider value={value}>{children}</CaughtContext.Provider>
  );
}
