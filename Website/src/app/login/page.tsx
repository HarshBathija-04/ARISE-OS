"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoginButton } from "./login-button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function bootstrap(accessToken: string) {
    try {
      await fetch(`${API_BASE}/v1/account/bootstrap`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    } catch {
      // Non-fatal — bootstrap is idempotent and also runs on next login.
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (err) throw err;
        if (!data.session) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
        await bootstrap(data.session.access_token);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        if (data.session) await bootstrap(data.session.access_token);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void-950 px-4">
      <div className="grid-overlay absolute inset-0 opacity-30" />
      <div className="absolute inset-0 bg-radial-arc" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-arc-blue/10 ring-1 ring-arc-blue/30">
            <img src="/logo.png" alt="Arise OS Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight">
            ARISE<span className="text-arc-blue">//</span>OS
          </h1>
          <p className="sys-label mt-1">
            {mode === "login" ? "Authenticate to enter the System" : "Register a new hunter"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="panel-glow space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          {mode === "signup" && (
            <div>
              <label className="sys-label mb-1 block" htmlFor="name">Designation</label>
              <input
                id="name" name="name" type="text" required autoComplete="name"
                className="w-full rounded-lg border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-arc-blue/50 focus:ring-1 focus:ring-arc-blue/40"
              />
            </div>
          )}
          <div>
            <label className="sys-label mb-1 block" htmlFor="email">Identifier</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="w-full rounded-lg border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-arc-blue/50 focus:ring-1 focus:ring-arc-blue/40"
            />
          </div>
          <div>
            <label className="sys-label mb-1 block" htmlFor="password">Access Key</label>
            <input
              id="password" name="password" type="password" required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-arc-blue/50 focus:ring-1 focus:ring-arc-blue/40"
            />
          </div>
          <LoginButton pending={pending} label={mode === "login" ? "Enter the System" : "Awaken"} />
          <p className="text-center text-xs text-slate-600">
            {mode === "login" ? (
              <>
                New hunter?{" "}
                <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="text-arc-blue hover:underline">
                  Register
                </button>
              </>
            ) : (
              <>
                Already awakened?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(null); }} className="text-arc-blue hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
