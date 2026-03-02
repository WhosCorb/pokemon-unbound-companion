"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

const MENU_ITEMS = [
  {
    label: "ITEMS & COLLECTIBLES",
    href: "/items",
    description: "TMs, Mega Stones, Z-Crystals, Key Items",
    color: "text-gba-yellow border-gba-yellow/40",
  },
  {
    label: "MISSION LOG",
    href: "/missions",
    description: "Available quests, objectives, rewards",
    color: "text-gba-green border-gba-green/40",
  },
  {
    label: "SETTINGS",
    href: "/settings",
    description: "Difficulty, milestones, current location",
    color: "text-gba-cyan border-gba-cyan/40",
  },
];

export default function MorePage() {
  return (
    <PageShell>
      <div className="space-y-2">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`gba-panel block p-3 border-2 ${item.color} hover:bg-white/5 transition-colors`}
          >
            <div className="font-pixel text-[9px] tracking-wider">
              {item.label}
            </div>
            <div className="font-mono text-[10px] text-gba-text-dim mt-1">
              {item.description}
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
