"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { useAuth } from "@/hooks/useAuth";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, isConfigured, user } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Already logged in
  if (user) {
    return (
      <PageShell>
        <div className="text-center space-y-4 py-8">
          <div className="font-pixel text-[10px] text-gba-green tracking-wider">
            LOGGED IN
          </div>
          <div className="font-mono text-[10px] text-gba-text-dim">
            {user.email}
          </div>
          <button
            onClick={() => router.push("/")}
            className="font-pixel text-[8px] px-4 py-2 border border-gba-cyan text-gba-cyan rounded-sm hover:bg-gba-cyan/10 transition-colors"
          >
            GO TO DASHBOARD
          </button>
        </div>
      </PageShell>
    );
  }

  // Supabase not configured
  if (!isConfigured) {
    return (
      <PageShell>
        <div className="text-center space-y-4 py-8">
          <div className="font-pixel text-[10px] text-gba-text tracking-wider">
            ACCOUNT SYNC
          </div>
          <div className="font-mono text-[10px] text-gba-text-dim space-y-2">
            <p>Cloud sync is not configured yet.</p>
            <p>Your data is saved locally on this device.</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="font-pixel text-[8px] px-4 py-2 border border-gba-cyan text-gba-cyan rounded-sm hover:bg-gba-cyan/10 transition-colors"
          >
            CONTINUE AS GUEST
          </button>
        </div>
      </PageShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result =
      mode === "sign-in"
        ? await signIn(email, password)
        : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === "sign-up") {
      setSuccess("Check your email to confirm your account.");
      return;
    }

    router.push("/");
  }

  return (
    <PageShell>
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="font-pixel text-[10px] text-gba-text tracking-wider">
            {mode === "sign-in" ? "SIGN IN" : "CREATE ACCOUNT"}
          </h1>
          <p className="font-mono text-[10px] text-gba-text-dim mt-1">
            Sync your data across devices
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-pixel text-[7px] text-gba-text-dim block mb-1">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                         px-3 py-2 rounded-sm outline-none focus:border-gba-cyan"
              placeholder="trainer@example.com"
            />
          </div>

          <div>
            <label className="font-pixel text-[7px] text-gba-text-dim block mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-[10px]
                         px-3 py-2 rounded-sm outline-none focus:border-gba-cyan"
              placeholder="Min 6 characters"
            />
          </div>

          {error && (
            <div className="font-mono text-[10px] text-gba-red bg-gba-red/10 border border-gba-red/40 px-3 py-2 rounded-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="font-mono text-[10px] text-gba-green bg-gba-green/10 border border-gba-green/40 px-3 py-2 rounded-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-pixel text-[8px] py-2.5 border-2 border-gba-cyan text-gba-cyan rounded-sm
                       hover:bg-gba-cyan/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "LOADING..."
              : mode === "sign-in"
                ? "SIGN IN"
                : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <button
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError("");
              setSuccess("");
            }}
            className="font-pixel text-[7px] text-gba-text-dim hover:text-gba-cyan transition-colors"
          >
            {mode === "sign-in"
              ? "NEED AN ACCOUNT? SIGN UP"
              : "HAVE AN ACCOUNT? SIGN IN"}
          </button>

          <div className="border-t border-gba-border pt-2">
            <button
              onClick={() => router.push("/")}
              className="font-pixel text-[7px] text-gba-text-dim hover:text-gba-text transition-colors"
            >
              CONTINUE AS GUEST
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
