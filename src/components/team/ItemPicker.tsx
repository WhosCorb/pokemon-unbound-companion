"use client";

import { useState, useMemo } from "react";
import itemsData from "../../../data/items.json";

interface ItemEntry {
  id: string;
  name: string;
  category: string;
  description: string;
}

const allItems = itemsData as ItemEntry[];

interface ItemPickerProps {
  value?: string;
  onChange: (item: string) => void;
}

export function ItemPicker({ value, onChange }: ItemPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase().trim();
    return allItems.filter((item) =>
      item.name.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                   px-2 py-1 rounded-sm outline-none hover:border-gba-border-light transition-colors text-left"
      >
        {value || "-- Held Item --"}
      </button>
    );
  }

  return (
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
          onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
          className="w-full text-left px-2 py-1 font-mono text-[10px] text-gba-text-dim hover:bg-white/5"
        >
          -- None --
        </button>
        {filtered.map((item) => (
          <button
            key={item.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(item.name); setIsOpen(false); setSearch(""); }}
            className="w-full text-left px-2 py-1 font-mono text-[10px] text-gba-text hover:bg-white/5 truncate"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
