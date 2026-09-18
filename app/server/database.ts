import {
  DatabaseNotConfigured,
  configured,
  pool,
  query,
  ready,
  type SqlClient,
} from "./postgres";
import { toPostgresSql } from "./postgres-sql";

/** The slice of the D1 API the routes actually use. */
export type Statement = {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
};

export type SqlDatabase = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]>;
};

export function isD1(value: unknown): boolean {
  const candidate = value as { prepare?: unknown; batch?: unknown } | undefined;
  return (
    !!candidate &&
    typeof candidate.prepare === "function" &&
    typeof candidate.batch === "function"
  );
}

/** Cloudflare D1 already speaks this API; normalise the missing bits. */
export function d1Database(binding: unknown): SqlDatabase {
  const database = binding as SqlDatabase;
  return {
    prepare: (text: string) => database.prepare(text),
    batch: async (statements) =>
      (await database.batch(statements)).map((result) => ({
        meta: { changes: result?.meta?.changes ?? 0 },
      })),
  };
}

export class PgStatement implements Statement {
  constructor(
    private readonly text: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]): Statement {
    return new PgStatement(this.text, values);
  }

  async first<T = Record<string, unknown>>(
    column?: string,
  ): Promise<T | null> {
    const rows = await this.rows();
    const row = rows[0];
    if (!row) return null;
    if (column) return row[column] as T;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    return { results: (await this.rows()) as T[] };
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const { changes } = await this.execute();
    return { meta: { changes } };
  }

  private async rows(): Promise<Record<string, unknown>[]> {
    return (await this.execute()).rows;
  }

  async execute(
    client?: SqlClient,
  ): Promise<{ rows: Record<string, unknown>[]; changes: number }> {
    await ready();
    const result = client
      ? await client.query(toPostgresSql(this.text), this.values)
      : await query(toPostgresSql(this.text), this.values);
    return { rows: result.rows, changes: result.rowCount ?? 0 };
  }
}

export function postgresDatabase(): SqlDatabase {
  if (!configured()) throw new DatabaseNotConfigured();
  return {
    prepare: (text: string) => new PgStatement(text),
    batch: async (statements) => {
      await ready();
      const client = await (await pool()).connect();
      try {
        await client.query("begin");
        const results: { meta: { changes: number } }[] = [];
        for (const statement of statements) {
          if (!(statement instanceof PgStatement))
            throw new Error("Only prepared statements can be batched.");
          const { changes } = await statement.execute(client);
          results.push({ meta: { changes } });
        }
        await client.query("commit");
        return results;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
