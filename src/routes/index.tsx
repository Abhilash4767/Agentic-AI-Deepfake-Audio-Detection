import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AudioWaveform, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeriVox — Deepfake Audio Detection Console" },
      {
        name: "description",
        content:
          "Sign in to VeriVox, the agentic AI console for deepfake audio detection with explainable forensic evidence.",
      },
      { property: "og:title", content: "VeriVox — Deepfake Audio Detection Console" },
      {
        property: "og:description",
        content: "Agentic AI deepfake audio detection with explainable forensic evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid work email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (err) throw err;
        if (data.session) {
          await upsertProfile(fullName);
          navigate({ to: "/dashboard", replace: true });
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await upsertProfile(fullName);
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function upsertProfile(name: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? null,
      full_name: name || (data.user.user_metadata["full_name"] as string) || null,
    });
  }

  async function google() {
    setError("");
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="grid-bg relative hidden flex-col justify-between border-r border-border bg-surface/40 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-primary" />
          <span className="font-semibold">VeriVox</span>
          <span className="label-xs ml-2">Agentic XAI Platform</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Agentic AI for Deepfake Audio Detection with Explainable AI (XAI)
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Seven specialised agents — Upload, Preprocessing, Feature Extraction, CNN, Wav2Vec2,
            Reasoning and XAI — collaborate on every sample and return SHAP, LIME and saliency
            evidence alongside the verdict.
          </p>
          <div className="mt-8 flex items-center gap-6 font-mono text-xs text-muted-foreground">
            <span>99.2% AUC</span>
            <span>· 7 agents</span>
            <span>· SOC 2 aligned</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> Audio and evidence stored in your private
          tenant
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="panel w-full max-w-sm space-y-5 p-8">
          <div>
            <p className="label-xs">Secure access</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {mode === "signin" ? "Sign in to the console" : "Create your analyst account"}
            </h1>
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.7 0 2.85.72 3.5 1.35l2.4-2.3A9.2 9.2 0 0 0 12 2.9a9.1 9.1 0 1 0 0 18.2c5.26 0 8.73-3.7 8.73-8.9 0-.6-.06-1.05-.13-1.5z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or email{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <label className="label-xs" htmlFor="name">
                Full name
              </label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  id="name"
                  value={fullName}
                  maxLength={80}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full bg-transparent text-sm outline-none"
                  placeholder="Alex Morgan"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="label-xs" htmlFor="email">
              Work email
            </label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                maxLength={120}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-xs" htmlFor="password">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                maxLength={64}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && <p className="text-xs text-success">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New to VeriVox?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setNotice("");
              }}
              className="text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
