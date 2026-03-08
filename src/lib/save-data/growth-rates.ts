/**
 * Pokemon experience growth rate formulas (Gen 3+).
 *
 * Each growth rate defines how much total experience is needed to reach
 * a given level. The game derives level from accumulated exp, so writing
 * the minimum exp for a target level is the authoritative way to set level.
 */

export type GrowthRate =
  | "medium-fast"
  | "fast"
  | "medium-slow"
  | "slow"
  | "erratic"
  | "fluctuating";

/**
 * Return the minimum total experience needed to be at `level`.
 * Level 1 always returns 0.
 */
export function getExpForLevel(growthRate: GrowthRate, level: number): number {
  if (level <= 1) return 0;
  const n = level;
  const n2 = n * n;
  const n3 = n2 * n;

  switch (growthRate) {
    case "fast":
      return Math.floor(4 * n3 / 5);

    case "medium-fast":
      return n3;

    case "medium-slow":
      return Math.max(0, Math.floor(6 * n3 / 5 - 15 * n2 + 100 * n - 140));

    case "slow":
      return Math.floor(5 * n3 / 4);

    case "erratic":
      return erraticExp(n);

    case "fluctuating":
      return fluctuatingExp(n);
  }
}

function erraticExp(n: number): number {
  const n3 = n * n * n;
  if (n <= 50) {
    return Math.floor(n3 * (100 - n) / 50);
  } else if (n <= 68) {
    return Math.floor(n3 * (150 - n) / 100);
  } else if (n <= 98) {
    return Math.floor(n3 * Math.floor((1911 - 10 * n) / 3) / 500);
  } else {
    return Math.floor(n3 * (160 - n) / 100);
  }
}

function fluctuatingExp(n: number): number {
  const n3 = n * n * n;
  if (n <= 15) {
    return Math.floor(n3 * (Math.floor((n + 1) / 3) + 24) / 50);
  } else if (n <= 36) {
    return Math.floor(n3 * (n + 14) / 50);
  } else {
    return Math.floor(n3 * (Math.floor(n / 2) + 32) / 50);
  }
}
