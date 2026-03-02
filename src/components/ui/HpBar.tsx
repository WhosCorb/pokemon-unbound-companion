interface HpBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  color?: "auto" | "green" | "yellow" | "red" | "blue" | "cyan";
}

export function HpBar({
  value,
  max = 100,
  showLabel = false,
  color = "auto",
}: HpBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  let colorClass: string;
  if (color === "auto") {
    if (percent > 50) colorClass = "hp-green";
    else if (percent > 25) colorClass = "hp-yellow";
    else colorClass = "hp-red";
  } else {
    const colorMap: Record<string, string> = {
      green: "hp-green",
      yellow: "hp-yellow",
      red: "hp-red",
      blue: "bg-gba-blue",
      cyan: "bg-gba-cyan",
    };
    colorClass = colorMap[color] || "hp-green";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hp-bar flex-1">
        <div
          className={`hp-bar-fill ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-pixel text-[7px] text-gba-text-dim whitespace-nowrap">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
