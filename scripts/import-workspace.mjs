/**
 * Move a workspace into the Postgres database a Vercel deployment uses.
 *
 * Sources:
 *   - a ".json" workspace backup downloaded from the app, or
 *   - the local D1 file under .wrangler/state
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/import-workspace.mjs backup.json
 *   DATABASE_URL=postgres://... node scripts/import-workspace.mjs .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<id>.sqlite
 */
import { readFile } from "node:fs/promises";
import { globSync } from "node:fs";
import pg from "pg";

const source = process.argv[2];
if (!source) {
  console.error("Pass a workspace .json backup or a local D1 .sqlite file.");
  process.exit(1);
}
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!connectionString) {
  console.error("Set DATABASE_URL to the database this workspace should move to.");
  process.exit(1);
}
const owner = (process.env.FLYERLY_OWNER_ID || "owner").trim() || "owner";

async function readSource(path) {
  if (path.endsWith(".json")) {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    // A backup from the app is the workspace itself; older ones wrapped it.
    return parsed.data ?? parsed;
  }
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const row = database
      .prepare("select data from workspaces where owner = ?")
      .get(owner);
    const fallback = row
      ? null
      : database
          .prepare("select data from workspaces order by updated desc limit 1")
          .get();
    const data = row?.data ?? fallback?.data;
    if (!data) throw new Error("No workspace row found in that database.");
    return JSON.parse(String(data));
  } finally {
    database.close();
  }
}

function resolveSqlite(path) {
  if (path.endsWith(".sqlite") || path.endsWith(".db")) return path;
  const matches = globSync(
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite",
  ).filter((file) => !file.includes("metadata"));
  if (matches.length !== 1)
    throw new Error(
      `Expected exactly one D1 database file, found ${matches.length}.`,
    );
  return matches[0];
}

const workspace = await readSource(resolveSqlite(source));
const campaigns = Array.isArray(workspace.campaigns) ? workspace.campaigns : [];
const products = Array.isArray(workspace.products) ? workspace.products : [];
if (!workspace.brand || !Array.isArray(workspace.customTemplates))
  throw new Error("That file is not a Flyerly workspace.");

const client = new pg.Client({ connectionString });
await client.connect();
await client.query(
  `create table if not exists workspaces (
     owner text primary key,
     data text not null,
     revision integer not null default 1,
     updated text not null
   )`,
);
const existing = await client.query(
  "select revision from workspaces where owner = $1",
  [owner],
);
const revision = Number(existing.rows[0]?.revision ?? 0);
if (existing.rowCount) {
  await client.query(
    "update workspaces set data = $2, revision = revision + 1, updated = $3 where owner = $1",
    [owner, JSON.stringify(workspace), new Date().toISOString()],
  );
} else {
  await client.query(
    "insert into workspaces (owner, data, revision, updated) values ($1, $2, 1, $3)",
    [owner, JSON.stringify(workspace), new Date().toISOString()],
  );
}
await client.end();
console.log(
  `Imported ${products.length} products and ${campaigns.length} campaigns into the "${owner}" workspace (was revision ${revision}).`,
);
