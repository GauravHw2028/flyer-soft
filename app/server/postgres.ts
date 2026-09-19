import type { Pool as PgPool } from "pg";

export type QueryResult = { rows: Record<string, unknown>[]; rowCount: number | null };

export type SqlClient = {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
};

export type SqlPool = SqlClient & {
  connect(): Promise<SqlClient & { release(): void }>;
};

/** Raised when the deployment has no database configured yet. */
export class DatabaseNotConfigured extends Error {
  constructor() {
    super(
      "No database is configured. Set DATABASE_URL to a Postgres connection string.",
    );
    this.name = "DatabaseNotConfigured";
  }
}

const CONNECTION_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
];
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "host.docker.internal"];

let override: SqlPool | null = null;
let poolPromise: Promise<SqlPool> | null = null;
let schema: Promise<void> | null = null;

/**
 * Test seam: swap the driver for an in-process Postgres so the storage layer
 * can be exercised without a server.
 */
export function setPool(next: SqlPool | null) {
  override = next;
  schema = null;
}

export function connectionString(): string {
  for (const key of CONNECTION_KEYS) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

/** Which environment variable the connection string came from. */
export function connectionSource(): string | null {
  for (const key of CONNECTION_KEYS) {
    const value = process.env[key];
    if (value && value.trim()) return key;
  }
  return null;
}

export function isLocalHost(host: string): boolean {
  return LOCAL_HOSTS.includes(host.toLowerCase());
}

export function connectionHost(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Managed Postgres providers terminate TLS with certificates Node does not
 * always ship, so encrypted-but-unverified is the default outside localhost.
 * Set FLYERLY_PG_VERIFY_FULL=1 (or sslmode=verify-full) to require a trusted
 * chain instead.
 */
function sslFor(url: string): false | { rejectUnauthorized: boolean } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (isLocalHost(parsed.hostname)) return false;
  const mode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
  if (mode === "disable") return false;
  if (mode === "verify-full") return { rejectUnauthorized: true };
  if (process.env.FLYERLY_PG_VERIFY_FULL === "1")
    return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

export function configured(): boolean {
  return Boolean(override) || Boolean(connectionString());
}

export function sql(): SqlPool {
  throw new Error("sql() is async; use pool()");
}

/**
 * The `pg` driver is loaded on first use so the Cloudflare Workers build never
 * evaluates a Node-only module: there, D1 and R2 provide storage instead.
 */
export async function pool(): Promise<SqlPool> {
  if (override) return override;
  if (!poolPromise) poolPromise = createPool();
  return poolPromise;
}

async function createPool(): Promise<SqlPool> {
  const url = connectionString();
  if (!url) throw new DatabaseNotConfigured();
  const { Pool } = await import("pg");
  return new Pool({
    connectionString: url,
    ssl: sslFor(url),
    max: 3,
    idleTimeoutMillis: 10_000,
    // Fail fast so the route can answer with a real error instead of letting
    // the hosting platform time the request out.
    connectionTimeoutMillis: 8_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
  }) as unknown as PgPool as unknown as SqlPool;
}

export type Diagnosis = {
  configured: boolean;
  source: string | null;
  host: string | null;
  ssl: boolean;
  reachable: boolean;
  schemaReady: boolean;
  serverVersion: string | null;
  error: string | null;
};

/** One round trip that explains exactly why storage is or is not working. */
export async function diagnose(): Promise<Diagnosis> {
  const url = connectionString();
  const base: Diagnosis = {
    configured: Boolean(override) || Boolean(url),
    source: connectionSource(),
    host: url ? connectionHost(url) : null,
    ssl: url ? sslFor(url) !== false : false,
    reachable: false,
    schemaReady: false,
    serverVersion: null,
    error: null,
  };
  if (!base.configured) {
    base.error =
      "No Postgres connection string found. Set DATABASE_URL on this deployment.";
    return base;
  }
  try {
    const client = await (await pool()).connect();
    try {
      const version = await client.query("select version() as version");
      base.reachable = true;
      base.serverVersion = String(
        (version.rows[0] as { version?: string })?.version ?? "",
      ).split(" ").slice(0, 2).join(" ");
      const table = await client.query(
        "select to_regclass('public.workspaces') as name",
      );
      base.schemaReady = Boolean(
        (table.rows[0] as { name?: string | null })?.name,
      );
    } finally {
      client.release();
    }
  } catch (error) {
    base.error = error instanceof Error ? error.message : String(error);
  }
  return base;
}

export async function query(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult> {
  return (await pool()).query(text, values);
}

/** Create the schema once per process so a fresh database just works. */
export async function ready(): Promise<void> {
  if (!schema) schema = migrate();
  return schema;
}

async function migrate(): Promise<void> {
  const statements = [
    `create table if not exists workspaces (
       owner text primary key,
       data text not null,
       revision integer not null default 1,
       updated text not null
     )`,
    `create table if not exists assets (
       id text primary key,
       owner text not null,
       name text not null,
       mime text not null,
       size integer not null,
       created text not null
     )`,
    `create index if not exists idx_assets_owner on assets (owner)`,
    `create table if not exists asset_blobs (
       id text primary key,
       mime text not null,
       bytes bytea not null,
       created text not null
     )`,
    `create table if not exists businesses (
       id text primary key,
       email text not null unique,
       name text not null,
       templates text not null default '[]',
       created text not null
     )`,
    `create table if not exists credit_accounts (
       owner text primary key,
       balance integer not null default 0
     )`,
    `create table if not exists credit_ledger (
       id text primary key,
       owner text not null,
       delta integer not null,
       reason text not null,
       created text not null
     )`,
    `create index if not exists idx_ledger_owner on credit_ledger (owner)`,
    `create table if not exists topups (
       id text primary key,
       owner text not null,
       email text not null,
       credits integer not null,
       reference text not null,
       status text not null default 'pending',
       created text not null,
       reviewer text
     )`,
    `create table if not exists enhancements (
       id text primary key,
       owner text not null,
       source text not null,
       status text not null,
       request text,
       result text,
       created text not null
     )`,
    `create table if not exists accounts (
       id text primary key,
       email text not null unique,
       password_hash text not null,
       store_name text not null default 'My store',
       created text not null
     )`,
    `create table if not exists sessions (
       token text primary key,
       account_id text not null,
       created text not null,
       expires text not null
     )`,
    `create index if not exists idx_sessions_account on sessions (account_id)`,
    // The ledger is the source of truth, so rebuild the cached balance from it.
    `insert into credit_accounts (owner, balance)
       select owner, coalesce(sum(delta), 0)::int from credit_ledger group by owner
     on conflict (owner) do update set balance = excluded.balance`,
    `create or replace function flyerly_credit_apply() returns trigger as $$
       begin
         insert into credit_accounts (owner, balance) values (new.owner, new.delta)
         on conflict (owner) do update
           set balance = credit_accounts.balance + excluded.balance;
         return null;
       end $$ language plpgsql`,
    `drop trigger if exists credit_apply on credit_ledger`,
    `create trigger credit_apply after insert on credit_ledger
       for each row execute function flyerly_credit_apply()`,
    `create or replace function flyerly_credit_guard() returns trigger as $$
       declare current_balance integer;
       begin
         select balance into current_balance from credit_accounts where owner = new.owner;
         if coalesce(current_balance, 0) + new.delta < 0 then
           raise exception 'Insufficient credits';
         end if;
         return new;
       end $$ language plpgsql`,
    `drop trigger if exists credit_guard on credit_ledger`,
    `create trigger credit_guard before insert on credit_ledger
       for each row execute function flyerly_credit_guard()`,
  ];
  const client = await (await pool()).connect();
  try {
    for (const statement of statements) await client.query(statement);
  } finally {
    client.release();
  }
}
