interface GbaPanelProps {
  title: string;
  headerColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function GbaPanel({
  title,
  headerColor = "bg-gba-green/20 text-gba-green",
  children,
  className = "",
}: GbaPanelProps) {
  return (
    <div className={`gba-panel ${className}`}>
      <div className={`gba-panel-header ${headerColor}`}>{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}
