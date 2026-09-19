import { env } from "cloudflare:workers";
import { currentAccount } from "../server/session";
import { db } from "./_shared";
export function settings() {
  return env as unknown as {
    FLYERLY_ADMIN_EMAILS?: string;
    FAL_KEY?: string;
    PAYMENT_INSTRUCTIONS?: string;
  };
}
export async function identity() {
  const account = await currentAccount();
  if (!account)
    throw Response.json({ error: "Sign in to continue." }, { status: 401 });
  const admins = (settings().FLYERLY_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return {
    userId: account.id,
    displayName: account.storeName,
    email: account.email,
    fullName: null,
    // Until an admin list is configured, every account has full access.
    isAdmin: admins.length ? admins.includes(account.email) : true,
  };
}
export async function admin() {
  return identity();
}
export async function account(owner: string) {
  const row = await db()
    .prepare(
      "SELECT COALESCE(SUM(delta),0) AS balance FROM credit_ledger WHERE owner=?",
    )
    .bind(owner)
    .first<{ balance: number | string }>();
  // Postgres returns SUM() as a string; D1 returns a number.
  return Number(row?.balance ?? 0);
}
