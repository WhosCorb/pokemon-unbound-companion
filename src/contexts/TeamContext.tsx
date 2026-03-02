"use client";

import { createContext, useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TeamSlot, UserTeam, PokemonType } from "@/lib/types";

interface TeamContextValue {
  team: UserTeam;
  slots: (TeamSlot | null)[];
  filledSlots: TeamSlot[];
  setSlot: (index: number, slot: TeamSlot | null) => void;
  removeSlot: (index: number) => void;
  updateSlot: (index: number, updates: Partial<TeamSlot>) => void;
  clearTeam: () => void;
  teamTypes: PokemonType[][];
}

const EMPTY_TEAM: UserTeam = {
  slots: [null, null, null, null, null, null],
};

export const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useLocalStorage<UserTeam>(
    "pkm-unbound-team",
    EMPTY_TEAM
  );

  const setSlot = useCallback(
    (index: number, slot: TeamSlot | null) => {
      setTeam((prev) => {
        const slots = [...prev.slots];
        slots[index] = slot;
        return { ...prev, slots };
      });
    },
    [setTeam]
  );

  const removeSlot = useCallback(
    (index: number) => {
      setSlot(index, null);
    },
    [setSlot]
  );

  const updateSlot = useCallback(
    (index: number, updates: Partial<TeamSlot>) => {
      setTeam((prev) => {
        const slots = [...prev.slots];
        const current = slots[index];
        if (!current) return prev;
        slots[index] = { ...current, ...updates };
        return { ...prev, slots };
      });
    },
    [setTeam]
  );

  const clearTeam = useCallback(() => {
    setTeam(EMPTY_TEAM);
  }, [setTeam]);

  const filledSlots = useMemo(
    () => team.slots.filter((s): s is TeamSlot => s !== null),
    [team.slots]
  );

  const teamTypes = useMemo(
    () => filledSlots.map((s) => s.types),
    [filledSlots]
  );

  const value = useMemo(
    (): TeamContextValue => ({
      team,
      slots: team.slots,
      filledSlots,
      setSlot,
      removeSlot,
      updateSlot,
      clearTeam,
      teamTypes,
    }),
    [team, filledSlots, setSlot, removeSlot, updateSlot, clearTeam, teamTypes]
  );

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}
