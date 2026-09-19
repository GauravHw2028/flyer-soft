import type { SqlDatabase } from "./database";
import { db, legacyOwnerId } from "./storage";

export type Account = {
  id: string;
  email: string;
  storeName: string;
  created: string;
};

const ITERATIONS = 120_000;
const KEY_BITS = 256;

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{2}/g) || []).map((pair) => parseInt(pair, 16)));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  // Types want an ArrayBuffer-backed view; the value is a fresh copy anyway.
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations, hash: "SHA-256" },
    material,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** PBKDF2 lives in Web Crypto, so the same hash works in Node and Workers. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(key)}`;
}

function sameHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  const key = await derive(
    password,
    fromHex(salt),
    Number(iterations) || ITERATIONS,
  );
  return sameHex(toHex(key), hash);
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function accountCount(database: SqlDatabase = db()) {
  const row = await database
    .prepare("SELECT COUNT(*) AS n FROM accounts")
    .first<{ n: number | string }>();
  return Number(row?.n ?? 0);
}

export async function findAccountByEmail(
  email: string,
  database: SqlDatabase = db(),
) {
  return database
    .prepare(
      'SELECT id, email, store_name AS "storeName", password_hash AS "passwordHash", created FROM accounts WHERE email = ?',
    )
    .bind(normaliseEmail(email))
    .first<Account & { passwordHash: string }>();
}

export async function createAccount(
  input: { email: string; password: string; storeName: string },
  database: SqlDatabase = db(),
): Promise<Account> {
  const account: Account = {
    id: crypto.randomUUID(),
    email: normaliseEmail(input.email),
    storeName: input.storeName.trim().slice(0, 60) || "My store",
    created: new Date().toISOString(),
  };
  await database
    .prepare(
      "INSERT INTO accounts (id, email, password_hash, store_name, created) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(
      account.id,
      account.email,
      await hashPassword(input.password),
      account.storeName,
      account.created,
    )
    .run();
  return account;
}

const SESSION_DAYS = 60;

export async function createSession(
  accountId: string,
  database: SqlDatabase = db(),
) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await database
    .prepare(
      "INSERT INTO sessions (token, account_id, created, expires) VALUES (?, ?, ?, ?)",
    )
    .bind(token, accountId, new Date().toISOString(), expires)
    .run();
  return { token, expires };
}

export async function accountForSession(
  token: string | undefined,
  database: SqlDatabase = db(),
): Promise<Account | null> {
  if (!token) return null;
  const row = await database
    .prepare(
      'SELECT a.id, a.email, a.store_name AS "storeName", a.created, s.expires FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token = ?',
    )
    .bind(token)
    .first<Account & { expires: string }>();
  if (!row) return null;
  if (new Date(row.expires).getTime() < Date.now()) {
    await deleteSession(token, database);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    storeName: row.storeName,
    created: row.created,
  };
}

export async function deleteSession(
  token: string,
  database: SqlDatabase = db(),
) {
  await database
    .prepare("DELETE FROM sessions WHERE token = ?")
    .bind(token)
    .run();
}

/**
 * The first account created on an install inherits the single workspace that
 * existed before accounts were introduced, so nobody loses their campaigns.
 */
export async function adoptLegacyWorkspace(
  accountId: string,
  database: SqlDatabase = db(),
) {
  const legacy = legacyOwnerId();
  if (legacy === accountId) return false;
  const row = await database
    .prepare("SELECT owner FROM workspaces WHERE owner = ?")
    .bind(legacy)
    .first<{ owner: string }>();
  if (!row) return false;
  await database
    .prepare("UPDATE workspaces SET owner = ? WHERE owner = ?")
    .bind(accountId, legacy)
    .run();
  for (const table of [
    "assets",
    "credit_ledger",
    "credit_accounts",
    "topups",
    "enhancements",
  ])
    await database
      .prepare(`UPDATE ${table} SET owner = ? WHERE owner = ?`)
      .bind(accountId, legacy)
      .run();
  return true;
}
