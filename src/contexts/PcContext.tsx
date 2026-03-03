"use client";

import { createContext, useCallback, useMemo } from "react";
import { useStorage } from "@/hooks/useStorage";
import type { PcPokemon, PcBox, UserPc } from "@/lib/types";

const BOX_SIZE = 30;
const DEFAULT_BOX_COUNT = 8;

function createEmptyBox(num: number): PcBox {
  return {
    number: num,
    name: `Box ${num + 1}`,
    pokemon: Array(BOX_SIZE).fill(null),
  };
}

const EMPTY_PC: UserPc = {
  boxes: Array.from({ length: DEFAULT_BOX_COUNT }, (_, i) => createEmptyBox(i)),
  activeBox: 0,
};

interface PcContextValue {
  pc: UserPc;
  activeBox: PcBox;
  setActiveBox: (index: number) => void;
  addPokemon: (boxNumber: number, position: number, pokemon: PcPokemon) => void;
  removePokemon: (boxNumber: number, position: number) => void;
  movePokemon: (
    fromBox: number,
    fromPos: number,
    toBox: number,
    toPos: number
  ) => void;
  renameBox: (boxNumber: number, name: string) => void;
  addToFirstEmpty: (pokemon: Omit<PcPokemon, "boxNumber" | "boxPosition">) => boolean;
  pokemonCount: number;
}

export const PcContext = createContext<PcContextValue | null>(null);

export function PcProvider({ children }: { children: React.ReactNode }) {
  const [pc, setPc] = useStorage<UserPc>("pkm-unbound-pc", EMPTY_PC);

  const setActiveBox = useCallback(
    (index: number) => {
      setPc((prev) => ({ ...prev, activeBox: index }));
    },
    [setPc]
  );

  const addPokemon = useCallback(
    (boxNumber: number, position: number, pokemon: PcPokemon) => {
      setPc((prev) => {
        const boxes = prev.boxes.map((box) => {
          if (box.number !== boxNumber) return box;
          const newPokemon = [...box.pokemon];
          newPokemon[position] = { ...pokemon, boxNumber, boxPosition: position };
          return { ...box, pokemon: newPokemon };
        });
        return { ...prev, boxes };
      });
    },
    [setPc]
  );

  const removePokemon = useCallback(
    (boxNumber: number, position: number) => {
      setPc((prev) => {
        const boxes = prev.boxes.map((box) => {
          if (box.number !== boxNumber) return box;
          const newPokemon = [...box.pokemon];
          newPokemon[position] = null;
          return { ...box, pokemon: newPokemon };
        });
        return { ...prev, boxes };
      });
    },
    [setPc]
  );

  const movePokemon = useCallback(
    (fromBox: number, fromPos: number, toBox: number, toPos: number) => {
      setPc((prev) => {
        const boxes = prev.boxes.map((box) => ({ ...box, pokemon: [...box.pokemon] }));
        const source = boxes.find((b) => b.number === fromBox);
        const dest = boxes.find((b) => b.number === toBox);
        if (!source || !dest) return prev;

        const pokemon = source.pokemon[fromPos];
        if (!pokemon) return prev;

        // Swap if destination has a pokemon
        const destPokemon = dest.pokemon[toPos];
        source.pokemon[fromPos] = destPokemon
          ? { ...destPokemon, boxNumber: fromBox, boxPosition: fromPos }
          : null;
        dest.pokemon[toPos] = { ...pokemon, boxNumber: toBox, boxPosition: toPos };

        return { ...prev, boxes };
      });
    },
    [setPc]
  );

  const renameBox = useCallback(
    (boxNumber: number, name: string) => {
      setPc((prev) => {
        const boxes = prev.boxes.map((box) =>
          box.number === boxNumber ? { ...box, name } : box
        );
        return { ...prev, boxes };
      });
    },
    [setPc]
  );

  const addToFirstEmpty = useCallback(
    (pokemon: Omit<PcPokemon, "boxNumber" | "boxPosition">): boolean => {
      let added = false;
      setPc((prev) => {
        for (const box of prev.boxes) {
          const emptyIdx = box.pokemon.findIndex((p) => p === null);
          if (emptyIdx !== -1) {
            const boxes = prev.boxes.map((b) => {
              if (b.number !== box.number) return b;
              const newPokemon = [...b.pokemon];
              newPokemon[emptyIdx] = {
                ...pokemon,
                boxNumber: box.number,
                boxPosition: emptyIdx,
              } as PcPokemon;
              return { ...b, pokemon: newPokemon };
            });
            added = true;
            return { ...prev, boxes };
          }
        }
        return prev;
      });
      return added;
    },
    [setPc]
  );

  const activeBox = pc.boxes[pc.activeBox] ?? pc.boxes[0];

  const pokemonCount = useMemo(
    () => pc.boxes.reduce((sum, box) => sum + box.pokemon.filter(Boolean).length, 0),
    [pc.boxes]
  );

  const value = useMemo(
    (): PcContextValue => ({
      pc,
      activeBox,
      setActiveBox,
      addPokemon,
      removePokemon,
      movePokemon,
      renameBox,
      addToFirstEmpty,
      pokemonCount,
    }),
    [pc, activeBox, setActiveBox, addPokemon, removePokemon, movePokemon, renameBox, addToFirstEmpty, pokemonCount]
  );

  return <PcContext.Provider value={value}>{children}</PcContext.Provider>;
}
