import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { sanitizeUsername } from "@/game/catalog";
import { Button } from "@/components/ui/button";
import { isRecoveryCallback } from "@/lib/auth-recovery";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Enter Veya World" },
      { name: "description", content: "Sign in or create a character to join Veya World." },
      { property: "og:title", content: "Enter Veya World" },
      { property: "og:description", content: "Sign in or create a character to join Veya World." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isRecoveryCallback(window.location.hash)) {
      void navigate({ to: "/reset-password", hash: window.location.hash.slice(1), replace: true });
      return;
    }
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void navigate({ to: "/play", replace: true });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMsg("If an account exists, check your email for a password link.");
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
      } else {
        const name = sanitizeUsername(username);
        if (name.length < 2) { setMsg("Pick a name with at least 2 characters."); return; }
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { username: name } },
        });
        if (error) setMsg(error.message);
        else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not connect. Please try again.");
    } finally { setBusy(false); }
  };

  const social = async (provider: "google" | "lovable") => {
    setBusy(true); setMsg(null);
    try {
      if (!import.meta.env["VITE_SUPABASE_URL"]) {
        const { error } = await supabase.auth.signInWithPassword({ email: "traveler@veya.local", password: "local-traveler" });
        if (error) setMsg(error.message);
        return;
      }
      const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (r.error) setMsg(r.error.message ?? "Sign-in failed");
    } catch { setMsg("Sign-in could not connect. Please try again."); }
    finally { setBusy(false); }
  };

  const input = "w-full border-2 border-border bg-input px-3 py-2 text-base text-foreground outline-none focus:border-primary";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="pixel-panel w-full max-w-sm p-6">
        <h1 className="text-center text-3xl text-primary">Veya World</h1>
        <p className="mb-5 mt-1 text-center text-sm text-muted-foreground">{mode === "in" ? "Welcome back, traveler." : mode === "reset" ? "Recover your account." : "Create your character."}</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "up" && (
            <input className={input} placeholder="Character name" maxLength={16} value={username} onChange={(e) => setUsername(e.target.value)} required />
          )}
          <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "reset" && <input aria-label="Password" className={input} type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />}
          <Button type="submit" disabled={busy} className="border-2 border-primary py-2 text-lg">
            {busy ? "Please wait…" : mode === "in" ? "Enter world" : mode === "reset" ? "Send password link" : "Create character"}
          </Button>
        </form>
        {mode === "in" && <Button variant="link" disabled={busy} onClick={() => { setMode("reset"); setMsg(null); }} className="mt-1 w-full text-muted-foreground">Forgot password?</Button>}
        {mode !== "reset" && <>
        <Button onClick={() => void social("google")} disabled={busy} type="button" variant="outline"
          className="mt-3 w-full gap-2.5">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </Button>
        <Button onClick={() => void social("lovable")} disabled={busy} type="button" className="lovable-auth-button mt-2 w-full">Continue with Lovable</Button>
        </>}
        {msg && <p role="status" className="mt-3 text-center text-sm text-primary">{msg}</p>}
        <Button variant="link" disabled={busy} onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); setPassword(""); }} className="mt-4 w-full whitespace-normal text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here? Create a character" : "Back to sign-in"}
        </Button>
      </div>
    </div>
  );
}
