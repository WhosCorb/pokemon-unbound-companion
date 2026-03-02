"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "SEARCH...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-xs
                   px-3 py-2 rounded-sm outline-none
                   focus:border-gba-cyan transition-colors
                   placeholder:text-gba-text-dim"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gba-text-dim text-xs">
        /
      </span>
    </div>
  );
}
