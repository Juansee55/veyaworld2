import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { canSetRecoveryPassword, isRecoveryCallback, passwordResetError, RECOVERY_MARKER } from "@/lib/auth-recovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Veya World" },
      { name: "description", content: "Securely choose a new password for your Veya World account." },
      { property: "og:title", content: "Reset password — Veya World" },
      { property: "og:description", content: "Securely choose a new password for your Veya World account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const recovery = isRecoveryCallback(window.location.hash) || window.sessionStorage.getItem(RECOVERY_MARKER) === "active";
    void supabase.auth.getUser().then(({ data, error }) => {
      const confirmedRecovery = recovery || window.sessionStorage.getItem(RECOVERY_MARKER) === "active";
      if (active) setStatus(canSetRecoveryPassword(confirmedRecovery, !error && !!data.user?.email_confirmed_at) ? "ready" : "invalid");
    }).catch(() => { if (active) setStatus("invalid"); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = passwordResetError(password, confirmation);
    if (validation) { setMessage(validation); return; }
    if (status !== "ready") return;
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirmation(""); setStatus("done");
      await supabase.auth.signOut();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password could not be updated. Request another link.");
    } finally { setBusy(false); }
  };

  const input = "w-full border-2 border-border bg-input px-3 py-2 text-base text-foreground outline-none focus:border-primary";
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="pixel-panel w-full max-w-sm p-6">
        <h1 className="text-center text-3xl text-primary">Veya World</h1>
        <h2 className="mb-5 mt-2 text-center text-xl">Choose a new password</h2>
        {status === "checking" && <p role="status" className="text-center text-muted-foreground">Checking your link…</p>}
        {status === "invalid" && <p role="alert" className="text-center text-destructive">This link is missing or has expired. Request a new one from sign-in.</p>}
        {status === "ready" && <form onSubmit={submit} className="flex flex-col gap-3">
          <input aria-label="New password" className={input} type="password" autoComplete="new-password" placeholder="New password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input aria-label="Confirm password" className={input} type="password" autoComplete="new-password" placeholder="Confirm password" minLength={6} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
          <Button type="submit" disabled={busy} className="border-2 border-primary text-lg">{busy ? "Saving…" : "Save password"}</Button>
        </form>}
        {status === "done" && <p role="status" className="text-center text-accent">Password saved. Sign in with your new password.</p>}
        {message && <p role="alert" className="mt-3 text-center text-sm text-destructive">{message}</p>}
        <Button asChild variant="link" className="mt-4 w-full"><Link to="/auth">Back to sign-in</Link></Button>
      </div>
    </main>
  );
}