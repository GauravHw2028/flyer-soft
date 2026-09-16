import { env } from "cloudflare:workers";

/**
 * Flyerly owns its data directly. One install is one workspace, so there is no
 * third-party identity provider in the request path: the owner id comes from
 * configuration and every route reads straight from it.
 *
 * Set `FLYERLY_OWNER_ID` when more than one install shares a single database.
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

export async function getWorkspaceUser(): Promise<WorkspaceUser> {
  return {
    userId: workspaceOwnerId(),
    displayName: storeName(),
    email: contactEmail(),
    fullName: null,
  };
}
