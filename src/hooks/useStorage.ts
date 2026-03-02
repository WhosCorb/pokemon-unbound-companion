"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import {
  createStorageAdapter,
  type StorageAdapter,
} from "@/lib/storage";

/**
 * Storage hook that uses Supabase when authenticated, localStorage when guest.
 * Same API as useLocalStorage for backward compatibility.
 */
export function useStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const adapterRef = useRef<StorageAdapter>(createStorageAdapter(user?.id));

  // Update adapter when auth state changes
  useEffect(() => {
    adapterRef.current = createStorageAdapter(user?.id);
  }, [user?.id]);

  // Hydrate from storage
  useEffect(() => {
    const adapter = adapterRef.current;
    adapter.get<T>(key).then((value) => {
      if (value !== null) {
        setStoredValue(value);
      }
      setIsHydrated(true);
    });
  }, [key, user?.id]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        adapterRef.current.set(key, nextValue);
        return nextValue;
      });
    },
    [key]
  );

  if (!isHydrated) return [initialValue, setValue];

  return [storedValue, setValue];
}
