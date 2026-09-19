"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AccountScreen, { type SessionAccount } from "./account-ui";
import Studio from "./studio";

type Status =
  | { state: "loading" }
  | { state: "signed-out"; accountsExist: boolean }
  | { state: "signed-in"; account: SessionAccount };

export default function AppShell() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let active = true;
    fetch("/api/session")
      .then((response) => response.json())
      .then((value) => {
        if (!active) return;
        const body = value as {
          account: SessionAccount | null;
          accountsExist: boolean;
        };
        setStatus(
          body.account
            ? { state: "signed-in", account: body.account }
            : { state: "signed-out", accountsExist: body.accountsExist },
        );
      })
      .catch(() =>
        setStatus(
          active ? { state: "signed-out", accountsExist: true } : { state: "loading" },
        ),
      );
    return () => {
      active = false;
    };
  }, []);

  if (status.state === "loading")
    return (
      <main className="account-shell">
        <p className="inline-loading">
          <Loader2 size={16} className="spin" />
          Opening workspace…
        </p>
      </main>
    );

  if (status.state === "signed-out")
    return (
      <AccountScreen
        accountsExist={status.accountsExist}
        onSignedIn={(account) => setStatus({ state: "signed-in", account })}
      />
    );

  return <Studio account={status.account} />;
}
