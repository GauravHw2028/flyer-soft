/**
 * Copy DATABASE_URL from the ignored .dev.vars into the Vercel projects.
 *
 * Use this after rotating the database password, or when moving to a new
 * database. The value travels through stdin, so it never appears in the command
 * line or in this script's output.
 *
 * Requires the Vercel CLI to be logged in (`npx vercel login`) and the project
 * names below to exist. Pass project names to override:
 *   node scripts/push-database-url-to-vercel.mjs flyer-soft
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const projects = process.argv.slice(2).filter(Boolean);
if (!projects.length) {
  console.error(
    "Pass at least one Vercel project name, for example: flyer-soft",
  );
  process.exit(1);
}

const line = readFileSync(".dev.vars", "utf8")
  .split(/\r?\n/)
  .find((entry) => entry.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL is missing from .dev.vars");
  process.exit(1);
}
const value = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
const host = new URL(value).host;

const push = (project, target) =>
  new Promise((resolve) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "vercel@latest",
        "env",
        "add",
        "DATABASE_URL",
        target,
        "--project",
        project,
        "--sensitive",
        "--yes",
        "--force",
      ],
      {
        env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
    child.stdin.write(value + "\n");
    child.stdin.end();
  });

let failed = 0;
for (const project of projects) {
  for (const target of ["production", "preview"]) {
    const result = await push(project, target);
    if (result.code !== 0) {
      failed++;
      console.error(
        `${project} ${target}: failed`,
        result.output.split(/\r?\n/).slice(-2).join(" "),
      );
    } else {
      console.log(`${project} ${target}: DATABASE_URL set (${host})`);
    }
  }
}

console.log(
  failed
    ? "Some writes failed. Check that you are logged in with `npx vercel login`."
    : "Done. Redeploy each project so the new value takes effect.",
);
process.exit(failed ? 1 : 0);
