"use client";
import { useState } from "react";
import { Loader2, Leaf, LogIn, UserPlus } from "lucide-react";

export type SessionAccount = {
  id: string;
  email: string;
  storeName: string;
  created: string;
};

/**
 * Sign in or create an account. There is no email step: a new account is usable
 * immediately and every account keeps its own products and campaigns.
 */
export default function AccountScreen({
  accountsExist,
  onSignedIn,
}: {
  accountsExist: boolean;
  onSignedIn: (account: SessionAccount) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">(
    accountsExist ? "login" : "signup",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, email, password, storeName }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        account?: SessionAccount;
        error?: string;
        hint?: string;
      };
      if (!response.ok || !body.account)
        throw new Error(
          [body.error, body.hint].filter(Boolean).join(" ") ||
            "That did not work. Please try again.",
        );
      onSignedIn(body.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-shell">
      <section className="account-card">
        <div className="wordmark account-wordmark">
          <span>
            <Leaf size={19} />
          </span>
          flyerly<span className="brand-dot">.</span>
        </div>
        <h1>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p>
          {mode === "signup"
            ? "Your products, prices and templates stay under this account."
            : "Sign in to open your workspace."}
        </p>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && (
            <label className="field">
              <span>Store name</span>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Wear Mart"
                maxLength={60}
                autoComplete="organization"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </label>
          {error && (
            <div className="notice error account-error" role="alert">
              <span>{error}</span>
            </div>
          )}
          <button className="button primary account-submit" disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : mode === "signup" ? (
              <UserPlus size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="text-button account-switch"
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError("");
          }}
        >
          {mode === "signup"
            ? "I already have an account"
            : "Create a new account"}
        </button>
        {!accountsExist && mode === "signup" && (
          <p className="help-text account-note">
            This is the first account on this install, so the products and
            campaigns already here move into it.
          </p>
        )}
      </section>
    </main>
  );
}
