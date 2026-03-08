"use client";

import { useState, useMemo } from "react";
import { ITEM_NAME_TO_ID } from "@/lib/save-data/items";
import itemsData from "../../../data/items.json";

interface ItemEntry {
  id: string;
  name: string;
  category: string;
  description: string;
}

const allItems = itemsData as ItemEntry[];

// Filter to holdable items (exclude key items, TMs, HMs)
const holdableItems = allItems.filter(
  (item) => !["key-item", "tm"].includes(item.category)
);

interface ItemEditorProps {
  currentItemName: string | null;
  onChange: (itemId: number, itemName: string) => void;
}

export function ItemEditor({ currentItemName, onChange }: ItemEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return holdableItems;
    const q = search.toLowerCase().trim();
    return holdableItems.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [search]);

  function handleSelect(itemName: string) {
    const itemId = ITEM_NAME_TO_ID.get(itemName) ?? 0;
    onChange(itemId, itemName);
    setIsOpen(false);
    setSearch("");
  }

  function handleClear() {
    onChange(0, "");
    setIsOpen(false);
    setSearch("");
  }

  if (!isOpen) {
    return (
      <div>
        <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Held Item</label>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                     px-2 py-1 rounded-sm outline-none hover:border-gba-border-light transition-colors text-left"
        >
          {currentItemName || "-- None --"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="font-mono text-[9px] text-gba-text-dim block mb-1">Held Item</label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          autoFocus
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full bg-gba-bg border-2 border-gba-cyan text-gba-text font-mono text-[10px]
                     px-2 py-1 rounded-sm outline-none"
        />
        <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-gba-panel border-2 border-gba-border rounded-sm max-h-32 overflow-y-auto">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="w-full text-left px-2 py-1 font-mono text-[10px] text-gba-text-dim hover:bg-white/5"
          >
            -- None --
          </button>
          {filtered.map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item.name)}
              className="w-full text-left px-2 py-1 font-mono text-[10px] text-gba-text hover:bg-white/5 truncate"
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
