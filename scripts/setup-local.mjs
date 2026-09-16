import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
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
    'FLYERLY_ADMIN_EMAILS="seedy@sites.test"\n',
  );
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/wrangler/bin/wrangler.js"),
    "d1",
    "migrations",
    "apply",
    "site-creator-d1",
    "--local",
    "--config",
    config,
    "--persist-to",
    resolve(root, ".wrangler/state"),
  ],
  {
    cwd: root,
    input: "y\n",
    stdio: ["pipe", "inherit", "inherit"],
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
      CLOUDFLARE_CF_FETCH_ENABLED: "false",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
