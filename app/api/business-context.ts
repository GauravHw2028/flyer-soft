import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../chatgpt-auth";
import { db } from "./_shared";
export function settings() {
  return env as unknown as {
    FLYERLY_ADMIN_EMAILS?: string;
    FAL_KEY?: string;
    PAYMENT_INSTRUCTIONS?: string;
  };
}
export async function identity() {
  const u = await getChatGPTUser();
  if (!u) throw Response.json({ error: "Please sign in." }, { status: 401 });
  return {
    ...u,
    isAdmin: (settings().FLYERLY_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .includes(u.email.toLowerCase()),
  };
}
export async function admin() {
  const u = await identity();
  if (!u.isAdmin)
    throw Response.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  return u;
}
export async function account(owner: string) {
  await db()
    .prepare(
      "INSERT OR IGNORE INTO credit_accounts (owner,balance) VALUES (?,0)",
    )
    .bind(owner)
    .run();
  return (await db()
    .prepare("SELECT balance FROM credit_accounts WHERE owner=?")
    .bind(owner)
    .first<{ balance: number }>())!.balance;
}
