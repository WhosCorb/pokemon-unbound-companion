"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase not configured" };

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const supabase = getSupabaseClient();
      if (!supabase) return { error: "Supabase not configured" };

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({
      user,
      session,
      isLoading,
      isGuest: !user,
      isConfigured: configured,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, isLoading, configured, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
