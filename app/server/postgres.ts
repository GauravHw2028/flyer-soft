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
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  }) as unknown as PgPool as unknown as SqlPool;
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
