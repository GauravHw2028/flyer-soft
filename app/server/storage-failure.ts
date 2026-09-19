import { DatabaseNotConfigured } from "./postgres";

export type StorageFailure = {
  status: number;
  code: string;
  error: string;
  hint: string;
};

const CONNECT_HINT =
  "If you use Supabase, copy the connection string from Project settings -> Database -> Connection pooling (the aws-0-*.pooler.supabase.com host). The direct db.<project>.supabase.co host is IPv6 only and cannot be reached from Vercel.";

/** Turn a driver error into something the person deploying the app can act on. */
export function storageFailure(error: unknown): StorageFailure {
  const message = error instanceof Error ? error.message : String(error);
  const code = String(
    (error as { code?: unknown })?.code ?? (error as { errno?: unknown })?.errno ?? "",
  ).toUpperCase();

  if (error instanceof DatabaseNotConfigured || /No database is configured/.test(message))
    return {
      status: 503,
      code: "database_not_configured",
      error: "This deployment is not connected to a database yet.",
      hint: "Add a Postgres database and set DATABASE_URL (or POSTGRES_URL) in the hosting environment variables, then redeploy. Open /api/health to check.",
    };

  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || /getaddrinfo|not found/.test(message))
    return {
      status: 503,
      code: "database_host_not_found",
      error: "The database host in DATABASE_URL could not be resolved.",
      hint: CONNECT_HINT,
    };

  if (
    ["ECONNREFUSED", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH", "ECONNRESET", "EPIPE"].includes(
      code,
    ) ||
    /timeout|timed out|terminated|closed/.test(message)
  )
    return {
      status: 503,
      code: "database_unreachable",
      error: "The database could not be reached.",
      hint: CONNECT_HINT,
    };

  if (code === "28P01" || code === "28000" || /password authentication failed|role .* does not exist/.test(message))
    return {
      status: 503,
      code: "database_auth_failed",
      error: "The database rejected those credentials.",
      hint: "DATABASE_URL contains the wrong user or password. Copy the connection string again and include the password, replacing any placeholder such as [YOUR-PASSWORD].",
    };

  if (code === "3D000" || /database .* does not exist/.test(message))
    return {
      status: 503,
      code: "database_missing",
      error: "DATABASE_URL points at a database that does not exist.",
      hint: "Create the database (or fix the name at the end of the connection string) and redeploy.",
    };

  if (
    code === "42P01" ||
    code === "42501" ||
    /permission denied|must be owner of|insufficient privilege/.test(message)
  )
    return {
      status: 503,
      code: "database_permission_denied",
      error: "The database user cannot create or read the app tables.",
      hint: "Give that role rights on the schema (for example grant usage, create on schema public to it, or connect as the database owner) and reload this page.",
    };

  if (code === "57P03" || /starting up|too many clients/.test(message))
    return {
      status: 503,
      code: "database_starting",
      error: "The database is starting up or is out of connections.",
      hint: "Wait a few seconds and reload. If it repeats, use the pooled connection string from your provider.",
    };

  if (/self[- ]signed certificate|unable to verify|certificate/i.test(message))
    return {
      status: 503,
      code: "database_tls",
      error: "The TLS certificate for the database was rejected.",
      hint: "Remove any sslmode parameter from DATABASE_URL, or set FLYERLY_PG_VERIFY_FULL=1 only when your provider's CA is trusted by Node.",
    };

  return {
    status: 503,
    code: "database_error",
    error: "The database request failed.",
    hint: `Open /api/health for the exact error. Driver said: ${message.slice(0, 200)}`,
  };
}
