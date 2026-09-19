import { bindings, db } from "../_shared";
import { isD1 } from "../../server/database";
import { diagnose } from "../../server/postgres";
import { isR2 } from "../../server/objects";
import { workspaceOwnerId } from "../../workspace-owner";

/**
 * One page that explains how this deployment is wired and what is broken.
 * Open /api/health directly in a browser when the workspace will not load.
 */
export async function GET() {
  const table = isD1(bindings().DB) ? "cloudflare-d1" : "postgres";
  const objects = isR2(bindings().BUCKET) ? "cloudflare-r2" : "postgres";
  // Only report Postgres diagnostics when Postgres is the backend actually in
  // use, so the Workers build does not look misconfigured.
  const database = table === "postgres" ? await diagnose() : null;

  let workspace = "unknown";
  if (table === "cloudflare-d1" || database?.reachable) {
    try {
      const row = await db()
        .prepare("SELECT COUNT(*) AS n FROM workspaces")
        .first<{ n: number | string }>();
      workspace = Number(row?.n ?? 0) > 0 ? "has data" : "empty";
    } catch {
      workspace = "unavailable";
    }
  }

  const ok =
    table === "cloudflare-d1" ||
    Boolean(database?.reachable && database?.schemaReady);
  return Response.json(
    {
      ok,
      owner: workspaceOwnerId(),
      storage: { database: table, objects },
      database,
      workspace,
      aiEnabled: Boolean(bindings().FAL_KEY),
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
