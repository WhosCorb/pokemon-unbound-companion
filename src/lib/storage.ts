import { getSupabaseClient } from "./supabase";

// ──────────────────────────────────────────────
// Storage Adapter Interface
// ──────────────────────────────────────────────

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

// ──────────────────────────────────────────────
// localStorage Adapter (Guest Mode)
// ──────────────────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage full or not available
    }
  }
}

// ──────────────────────────────────────────────
// Supabase Adapter (Authenticated Mode)
// ──────────────────────────────────────────────

// Maps localStorage keys to Supabase table/column pairs
const KEY_TABLE_MAP: Record<string, { table: string; column: string }> = {
  "pkm-unbound-progress": { table: "user_progress", column: "data" },
  "pkm-unbound-team": { table: "user_team", column: "data" },
  "pkm-unbound-pc": { table: "user_pc", column: "data" },
  "pkm-unbound-caught": { table: "user_caught", column: "data" },
  "pkm-unbound-items": { table: "user_items", column: "data" },
  "pkm-unbound-missions": { table: "user_missions", column: "data" },
};

export class SupabaseStorageAdapter implements StorageAdapter {
  private userId: string;
  private localFallback: LocalStorageAdapter;

  constructor(userId: string) {
    this.userId = userId;
    this.localFallback = new LocalStorageAdapter();
  }

  async get<T>(key: string): Promise<T | null> {
    const mapping = KEY_TABLE_MAP[key];
    if (!mapping) return this.localFallback.get<T>(key);

    const supabase = getSupabaseClient();
    if (!supabase) return this.localFallback.get<T>(key);

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select(mapping.column)
        .eq("user_id", this.userId)
        .single();

      if (error || !data) {
        return this.localFallback.get<T>(key);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any)[mapping.column] as T;
    } catch {
      return this.localFallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Always write to localStorage as cache
    await this.localFallback.set(key, value);

    const mapping = KEY_TABLE_MAP[key];
    if (!mapping) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from(mapping.table).upsert(
        {
          user_id: this.userId,
          [mapping.column]: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {
      // Supabase write failed, data is still in localStorage
    }
  }
}

// ──────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────

export function createStorageAdapter(userId?: string): StorageAdapter {
  if (userId) {
    return new SupabaseStorageAdapter(userId);
  }
  return new LocalStorageAdapter();
}
