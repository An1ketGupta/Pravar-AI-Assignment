"use client";

import { ArrowRight, Check, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { demoEnabled, getSupabase } from "@/lib/supabase";
import { Brand } from "./brand";
import { useAuth } from "./providers";
import { Button } from "./ui/button";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 20.5H24v8h11.3c-1.1 5.3-5.5 8.5-11.3 8.5a13 13 0 1 1 0-26c3.1 0 5.9 1.1 8.1 3.2l6.1-6.1A21 21 0 1 0 24 45c12.2 0 20.3-8.5 20.3-20.5 0-1.5-.2-2.8-.7-4Z"
      />
      <path
        fill="#34A853"
        d="M6.4 35.5 13 30.4A13 13 0 0 0 24 37c5.8 0 10.2-3.2 11.3-8.5H24v-8h19.6c.5 1.2.7 2.5.7 4C44.3 36.5 36.2 45 24 45A21 21 0 0 1 6.4 35.5Z"
      />
      <path
        fill="#FBBC05"
        d="M3 24c0-3.6.9-6.9 2.5-9.9l7 5.4a13 13 0 0 0 0 9l-7 5.4A21 21 0 0 1 3 24Z"
      />
      <path
        fill="#EA4335"
        d="M24 3a21 21 0 0 0-18.5 11.1l7 5.4A13 13 0 0 1 24 11c3.1 0 5.9 1.1 8.1 3.2l6.1-6.1A20.8 20.8 0 0 0 24 3Z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const { startDemo } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(getSupabase());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      setError("Google sign-in wasn’t completed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
      setError(
        "Sign-in is not configured yet. Please contact the workspace owner.",
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: String(form.get("name")).trim() } },
        });
        if (authError) throw authError;
        if (!data.session) {
          setError(
            "Your account was created, but email confirmation is enabled. Check your inbox to continue.",
          );
        } else {
          toast.success("Your workspace is ready. Welcome to LeadFlow!");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Google sign-in is not configured yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to connect to Google.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Brand />
        <span className="auth-header-note">
          A little follow-through goes a long way.
        </span>
      </header>
      <div className="auth-layout">
        <section className="auth-story">
          <span className="eyebrow">
            GOOD CONVERSATIONS. GREAT RELATIONSHIPS.
          </span>
          <h1>
            Every lead.
            <br />
            Every conversation.
            <br />
            <span>One clear next step.</span>
          </h1>
          <p>
            A calmer way to manage your pipeline. Keep the context, remember the
            follow-up, and move relationships forward.
          </p>
          <div className="auth-benefits">
            {[
              "Your conversations, all in one place",
              "Follow-ups that stay front and center",
              "A private workspace that’s yours",
            ].map((item) => (
              <div key={item}>
                <span>
                  <Check size={14} />
                </span>
                {item}
              </div>
            ))}
          </div>
          <div className="story-preview">
            <div className="story-preview-avatar">SC</div>
            <div>
              <strong>Sarah Connor</strong>
              <span>Acme Corp</span>
            </div>
            <span className="story-preview-badge">
              Next conversation, today
            </span>
          </div>
        </section>
        <section className="auth-card" aria-label="Account access">
          <span className="auth-icon">
            <LockKeyhole size={22} />
          </span>
          <h2>
            {mode === "login" ? "Welcome back" : "Make room for opportunity"}
          </h2>
          <p>
            {mode === "login"
              ? "Sign in to pick up where you left off."
              : "Your next great conversation starts here."}
          </p>
          <div className="auth-tabs">
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </button>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={google}
            disabled={busy || !configured}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="auth-divider">
            <span />
            or use your email
            <span />
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  maxLength={120}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                disabled={busy}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "signup"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                minLength={mode === "signup" ? 8 : 1}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || !configured}
            >
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <>
                  {mode === "login" ? "Sign in" : "Create your workspace"}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
          <p className="auth-private">
            Your leads and discussions are private to your account.
          </p>
          {demoEnabled && (
            <div className="local-preview-option">
              <span>Explore without connecting an account</span>
              <Button variant="ghost" size="small" onClick={startDemo}>
                Open local preview
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </section>
      </div>
      <footer className="auth-footer">
        LeadFlow · Thoughtful follow-ups. Stronger relationships.
      </footer>
    </main>
  );
}
