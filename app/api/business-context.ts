import { env } from "cloudflare:workers";
import { getWorkspaceUser } from "../workspace-owner";
import { db } from "./_shared";
export function settings() {
  return env as unknown as {
    FLYERLY_ADMIN_EMAILS?: string;
    FAL_KEY?: string;
    PAYMENT_INSTRUCTIONS?: string;
  };
}
export async function identity() {
  const u = await getWorkspaceUser();
  // One install, one workspace: whoever runs the app owns it, so the owner is
  // also the administrator who approves credit top-ups and template packs.
  return { ...u, isAdmin: true };
}
export async function admin() {
  return identity();
}
export async function account(owner: string) {
  return (await db()
    .prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM credit_ledger WHERE owner=?")
    .bind(owner)
    .first<{ balance: number }>())!.balance;
}
