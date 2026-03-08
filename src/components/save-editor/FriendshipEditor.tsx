"use client";

interface FriendshipEditorProps {
  value: number;
  onChange: (value: number) => void;
}

const PRESETS = [
  { label: "0", value: 0 },
  { label: "70", value: 70 },
  { label: "160", value: 160 },
  { label: "220", value: 220 },
  { label: "MAX", value: 255 },
];

export function FriendshipEditor({ value, onChange }: FriendshipEditorProps) {
  return (
    <div>
      <label className="font-mono text-[9px] text-gba-text-dim block mb-1">
        Friendship ({value})
      </label>
      <input
        type="range"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 appearance-none bg-gba-border rounded-sm
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gba-cyan
                   [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="flex gap-1 mt-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className={`flex-1 font-pixel text-[7px] py-0.5 border rounded-sm transition-colors
              ${value === p.value
                ? "border-gba-cyan/60 bg-gba-cyan/10 text-gba-cyan"
                : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
