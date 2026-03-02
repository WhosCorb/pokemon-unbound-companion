"use client";

import { useState, useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { HpBar } from "@/components/ui/HpBar";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { Item, PokemonType } from "@/lib/types";
import itemsData from "../../../data/items.json";

const items = itemsData as Item[];

// -- Category tab definitions --

type CategoryFilter = "ALL" | "tm" | "mega-stone" | "evolution-item" | "key-item" | "held-item";

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "tm", label: "TM" },
  { key: "mega-stone", label: "MEGA" },
  { key: "evolution-item", label: "EVOLUTION" },
  { key: "key-item", label: "KEY" },
  { key: "held-item", label: "HELD" },
];

const CATEGORY_LABEL: Record<string, string> = {
  tm: "TM",
  "mega-stone": "MEGA",
  "evolution-item": "EVOLUTION",
  "key-item": "KEY",
  "held-item": "HELD",
};

const CATEGORY_COLORS: Record<string, string> = {
  tm: "text-gba-blue border-gba-blue/40 bg-gba-blue/10",
  "mega-stone": "text-gba-red border-gba-red/40 bg-gba-red/10",
  "evolution-item": "text-gba-yellow border-gba-yellow/40 bg-gba-yellow/10",
  "key-item": "text-gba-green border-gba-green/40 bg-gba-green/10",
  "held-item": "text-gba-cyan border-gba-cyan/40 bg-gba-cyan/10",
};

export default function ItemsPage() {
  const { isUnlocked } = useProgress();
  const [foundItems, setFoundItems] = useLocalStorage<string[]>(
    "pkm-unbound-found-items",
    []
  );
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // -- Derived data --

  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter
    if (activeCategory !== "ALL") {
      result = result.filter((item) => item.category === activeCategory);
    }

    // Available-only filter
    if (showAvailableOnly) {
      result = result.filter((item) => isUnlocked(item.milestoneRequired));
    }

    return result;
  }, [activeCategory, showAvailableOnly, isUnlocked]);

  const foundCount = foundItems.length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (foundCount / totalCount) * 100 : 0;

  // -- Handlers --

  function toggleItem(itemId: string) {
    setFoundItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  return (
    <PageShell>
      {/* Progress Summary */}
      <GbaPanel title="ITEMS & COLLECTIBLES" headerColor="bg-gba-yellow/20 text-gba-yellow">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-gba-text">
              {foundCount}/{totalCount} FOUND
            </span>
            <span className="font-pixel text-[7px] text-gba-text-dim">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <HpBar value={foundCount} max={totalCount} color="auto" />
        </div>
      </GbaPanel>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`font-pixel text-[7px] py-2 px-3 border-2 rounded-sm transition-colors min-h-[44px] min-w-[44px]
              ${
                activeCategory === tab.key
                  ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Available / All Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAvailableOnly((prev) => !prev)}
          className={`font-pixel text-[7px] py-1.5 px-3 border-2 rounded-sm transition-colors min-h-[44px]
            ${
              showAvailableOnly
                ? "border-gba-green bg-gba-green/10 text-gba-green"
                : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
            }`}
        >
          {showAvailableOnly ? "AVAILABLE" : "ALL"}
        </button>
      </div>

      {/* Item List */}
      <GbaPanel title={`${activeCategory === "ALL" ? "ALL ITEMS" : CATEGORY_TABS.find((t) => t.key === activeCategory)?.label ?? "ITEMS"} (${filteredItems.length})`} headerColor="bg-gba-yellow/20 text-gba-yellow">
        <div className="space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 font-mono text-xs text-gba-text-dim">
              No items match the current filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const locked = !isUnlocked(item.milestoneRequired);
              const found = foundItems.includes(item.id);

              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  found={found}
                  locked={locked}
                  onToggle={() => toggleItem(item.id)}
                />
              );
            })
          )}
        </div>
      </GbaPanel>
    </PageShell>
  );
}

// -- Item Row Component --

function ItemRow({
  item,
  found,
  locked,
  onToggle,
}: {
  item: Item;
  found: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  const categoryLabel = CATEGORY_LABEL[item.category] ?? item.category.toUpperCase();
  const categoryColor = CATEGORY_COLORS[item.category] ?? "text-gba-text-dim border-gba-border/40 bg-gba-border/10";

  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={`w-full text-left flex items-start gap-2.5 px-2 py-2.5 rounded-sm transition-colors min-h-[44px]
        ${locked ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5 cursor-pointer"}
        ${found ? "bg-gba-green/5" : ""}`}
    >
      {/* Found/Unfound marker */}
      <span
        className={`font-pixel text-[10px] w-4 text-center flex-shrink-0 mt-0.5 ${
          locked
            ? "text-gba-red"
            : found
              ? "text-gba-green"
              : "text-gba-text-dim"
        }`}
      >
        {locked ? "X" : found ? "+" : "-"}
      </span>

      {/* Item details */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-mono text-xs ${
              found ? "text-gba-text" : "text-gba-text-dim"
            }`}
          >
            {item.name}
          </span>

          {/* Category badge */}
          <span
            className={`font-pixel text-[6px] px-1.5 py-0.5 border rounded-sm ${categoryColor}`}
          >
            {categoryLabel}
          </span>

          {/* Locked label */}
          {locked && (
            <span className="font-pixel text-[6px] px-1.5 py-0.5 border rounded-sm text-gba-red border-gba-red/40 bg-gba-red/10">
              LOCKED
            </span>
          )}
        </div>

        {/* TM move and type */}
        {item.tmMove && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-gba-text-dim">
              {item.tmMove}
            </span>
            {item.tmType && (
              <TypeBadge
                type={item.tmType.toLowerCase() as PokemonType}
                size="sm"
              />
            )}
          </div>
        )}

        {/* Location */}
        {item.locationName && (
          <div className="font-mono text-[10px] text-gba-text-dim">
            {item.locationName}
          </div>
        )}

        {/* Description */}
        <div className="font-mono text-[10px] text-gba-text-dim/70 leading-relaxed">
          {item.description}
        </div>
      </div>
    </button>
  );
}
