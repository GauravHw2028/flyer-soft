import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const persistTo = resolve(root, ".wrangler/state");
const database = "site-creator-d1";
mkdirSync(resolve(root, ".sites-runtime"), { recursive: true });
const config = resolve(root, ".sites-runtime/local-db.json");
writeFileSync(
  config,
  JSON.stringify(
    {
      name: "flyerly-local",
      compatibility_date: "2026-05-01",
      d1_databases: [
        {
          binding: "DB",
          database_name: "site-creator-d1",
          database_id: "00000000-0000-4000-8000-000000000000",
          migrations_dir: resolve(root, "drizzle"),
        },
      ],
    },
    null,
    2,
  ),
);
if (!existsSync(resolve(root, ".dev.vars")))
  writeFileSync(
    resolve(root, ".dev.vars"),
    'FLYERLY_OWNER_ID="owner"\nFLYERLY_STORE_NAME="Local store workspace"\n',
  );
const wranglerEnv = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_CF_FETCH_ENABLED: "false",
};

const run = (args, input) =>
  spawnSync(process.execPath, [wrangler, ...args], {
    cwd: root,
    input,
    encoding: "utf8",
    env: wranglerEnv,
  });

const execute = (sql) =>
  run([
    "d1",
    "execute",
    database,
    "--local",
    "--config",
    config,
    "--persist-to",
    persistTo,
    "--json",
    "--command",
    sql,
  ]);

const tables = () => {
  const result = execute(
    "select name from sqlite_master where type='table'",
  );
  if (result.status !== 0) return new Set();
  try {
    const parsed = JSON.parse(result.stdout);
    return new Set(
      (parsed?.[0]?.results || []).map((row) => String(row.name)),
    );
  } catch {
    return new Set();
  }
};

const applyMigrations = () =>
  run(
    [
      "d1",
      "migrations",
      "apply",
      database,
      "--local",
      "--config",
      config,
      "--persist-to",
      persistTo,
    ],
    "y\n",
  );

const migrations = () =>
  readdirSync(resolve(root, "drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort();

// Tables the app needs. Older installs were bootstrapped without recording the
// migrations, so a plain `migrations apply` trips over "table already exists".
const accountTables = [
  "create table if not exists accounts (id text primary key, email text not null, password_hash text not null, store_name text default 'My store' not null, created text not null)",
  "create unique index if not exists accounts_email_unique on accounts (email)",
  "create table if not exists sessions (token text primary key, account_id text not null, created text not null, expires text not null)",
  "create index if not exists idx_sessions_account on sessions (account_id)",
];

const includeScript = [
  "insert or ignore into d1_migrations (name) values",
  migrations()
    .map((file) => `('${file.replace(/'/g, "''")}')`)
    .join(", "),
].join(" ");

let result = applyMigrations();
let applied = result.status === 0;

if (!applied) {
  const present = tables();
  const bootstrapped =
    present.has("workspaces") && present.has("assets");
  if (bootstrapped) {
    for (const statement of accountTables) {
      if (execute(statement).status !== 0) {
        applied = false;
        break;
      }
    }
    const after = tables();
    if (after.has("accounts") && after.has("sessions")) {
      execute(includeScript);
      applied = true;
      console.log(
        "Existing local database detected; recorded migrations and added the account tables.",
      );
    }
  }
}

if (!applied) {
  process.stderr.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  console.error("Local database setup failed.");
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
