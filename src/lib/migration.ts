import { getSupabaseClient } from "./supabase";

const STORAGE_KEYS = [
  "pkm-unbound-progress",
  "pkm-unbound-team",
  "pkm-unbound-pc",
  "pkm-unbound-caught",
  "pkm-unbound-items",
  "pkm-unbound-missions",
];

const KEY_TABLE_MAP: Record<string, string> = {
  "pkm-unbound-progress": "user_progress",
  "pkm-unbound-team": "user_team",
  "pkm-unbound-pc": "user_pc",
  "pkm-unbound-caught": "user_caught",
  "pkm-unbound-items": "user_items",
  "pkm-unbound-missions": "user_missions",
};

/**
 * Check if the user has local data that could be migrated to Supabase.
 */
export function hasLocalData(): boolean {
  return STORAGE_KEYS.some((key) => {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
}

/**
 * Check if Supabase already has data for this user.
 */
export async function hasRemoteData(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("user_progress")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  return data !== null;
}

/**
 * Migrate all local data to Supabase for the given user.
 */
export async function migrateLocalToSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  for (const key of STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const data = JSON.parse(raw);
      const table = KEY_TABLE_MAP[key];
      if (!table) continue;

      await supabase.from(table).upsert(
        {
          user_id: userId,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {
      // Skip keys that fail to migrate
    }
  }
}
