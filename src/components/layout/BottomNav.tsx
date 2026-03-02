"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavTab {
  label: string;
  href: string;
  icon: string;
}

const TABS: NavTab[] = [
  { label: "HOME", href: "/", icon: "^" },
  { label: "TEAM", href: "/team", icon: "*" },
  { label: "DEX", href: "/pokedex", icon: "#" },
  { label: "MAP", href: "/locations", icon: "+" },
  { label: "MORE", href: "/more", icon: "=" },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gba-panel border-t-3 border-gba-border">
      <div className="flex items-stretch max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors relative
                ${
                  active
                    ? "text-gba-cyan"
                    : "text-gba-text-dim hover:text-gba-text"
                }`}
            >
              {active && (
                <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gba-cyan" />
              )}
              <span className="font-pixel text-[10px]">{tab.icon}</span>
              <span className="font-pixel text-[7px] tracking-wider">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
