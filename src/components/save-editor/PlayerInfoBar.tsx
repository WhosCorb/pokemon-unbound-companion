"use client";

import type { SavePlayerInfo } from "@/lib/save-parser";

interface PlayerInfoBarProps {
  player: SavePlayerInfo;
  money: number;
  coins: number;
}

export function PlayerInfoBar({ player, money, coins }: PlayerInfoBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-gba-text">
      <span>{player.name}</span>
      <span className="text-gba-text-dim">
        {player.badgeCount} badge{player.badgeCount !== 1 ? "s" : ""}
      </span>
      {money > 0 && (
        <span className="text-gba-yellow">${money.toLocaleString()}</span>
      )}
      {coins > 0 && (
        <span className="text-gba-text-dim">{coins} coins</span>
      )}
    </div>
  );
}
