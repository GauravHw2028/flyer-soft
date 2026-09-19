import { env } from "cloudflare:workers";

/**
 * Accounts own their own workspaces; this module holds configuration and the
 * single workspace key an install used before accounts existed, which the first
 * sign-up inherits.
 */
export type WorkspaceUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export const DEFAULT_OWNER_ID = "owner";

/** Read a setting from the worker env first, then from the Node process env. */
export function setting(name: string): string {
  try {
    const value = (env as unknown as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Not a Cloudflare worker runtime; fall through to process.env.
  }
  const fromProcess =
    typeof process === "undefined" ? undefined : process.env?.[name];
  return typeof fromProcess === "string" ? fromProcess.trim() : "";
}

export function workspaceOwnerId(): string {
  return setting("FLYERLY_OWNER_ID") || DEFAULT_OWNER_ID;
}

export function storeName(): string {
  return setting("FLYERLY_STORE_NAME") || "Your store";
}

export function contactEmail(): string {
  return setting("FLYERLY_CONTACT_EMAIL") || "owner@localhost";
}
