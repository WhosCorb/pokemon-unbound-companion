import type { Milestone, UserProgress } from "./types";

/**
 * Check if a piece of content is accessible given the user's progress.
 * Returns true if the content's required milestone has been completed.
 */
export function isAccessible(
  milestoneRequired: string,
  completedMilestones: string[]
): boolean {
  if (!milestoneRequired || milestoneRequired === "game_start") return true;
  return completedMilestones.includes(milestoneRequired);
}

/**
 * Filter an array of items by their milestoneRequired field.
 */
export function filterByProgress<T extends { milestoneRequired: string }>(
  items: T[],
  completedMilestones: string[]
): T[] {
  return items.filter((item) =>
    isAccessible(item.milestoneRequired, completedMilestones)
  );
}

/**
 * Partition items into accessible and locked based on progress.
 */
export function partitionByProgress<T extends { milestoneRequired: string }>(
  items: T[],
  completedMilestones: string[]
): { accessible: T[]; locked: T[] } {
  const accessible: T[] = [];
  const locked: T[] = [];
  for (const item of items) {
    if (isAccessible(item.milestoneRequired, completedMilestones)) {
      accessible.push(item);
    } else {
      locked.push(item);
    }
  }
  return { accessible, locked };
}

/**
 * Get the next uncompleted milestone from the ordered milestone list.
 */
export function getNextMilestone(
  milestones: Milestone[],
  completedMilestones: string[]
): Milestone | null {
  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  return sorted.find((m) => !completedMilestones.includes(m.id)) ?? null;
}

/**
 * Get the current badge count from completed milestones.
 */
export function getBadgeCount(completedMilestones: string[]): number {
  return completedMilestones.filter((m) => m.startsWith("badge_")).length;
}

/**
 * Create a default progress state.
 */
export function createDefaultProgress(): UserProgress {
  return {
    completedMilestones: ["game_start"],
    currentLocation: "frozen_heights",
    difficulty: "expert",
  };
}
