import { configured, query, ready } from "./postgres";

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

export type ObjectStore = {
  put(
    key: string,
    value: Uint8Array | ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};

export function isR2(value: unknown): boolean {
  const candidate = value as { put?: unknown; get?: unknown } | undefined;
  return (
    !!candidate &&
    typeof candidate.put === "function" &&
    typeof candidate.get === "function"
  );
}

export function r2Bucket(binding: unknown): ObjectStore {
  const bucket = binding as {
    put(
      key: string,
      value: Uint8Array | ArrayBuffer,
      options?: unknown,
    ): Promise<unknown>;
    get(key: string): Promise<StoredObject | null>;
    delete(key: string): Promise<void>;
  };
  return {
    put: async (key, value, options) => {
      await bucket.put(key, value, options);
    },
    get: (key) => bucket.get(key),
    delete: (key) => bucket.delete(key),
  };
}

/**
 * Image bytes live beside the workspace rows, so a Vercel deploy needs one
 * integration (a Postgres database) instead of two. Uploads stay well under the
 * request body limit Vercel applies to functions.
 */
export function postgresObjects(): ObjectStore {
  if (!configured()) throw new Error("Object storage is unavailable");
  return {
    async put(key, value, options) {
      await ready();
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      await query(
        `insert into asset_blobs (id, mime, bytes, created) values ($1, $2, $3, $4)
         on conflict (id) do update set mime = excluded.mime, bytes = excluded.bytes`,
        [
          key,
          options?.httpMetadata?.contentType || "application/octet-stream",
          Buffer.from(bytes),
          new Date().toISOString(),
        ],
      );
    },
    async get(key) {
      await ready();
      const { rows } = await query(
        "select mime, bytes from asset_blobs where id = $1",
        [key],
      );
      const row = rows[0];
      if (!row) return null;
      const bytes = new Uint8Array(row.bytes as Buffer);
      const body = new Response(bytes).body;
      if (!body) return null;
      return {
        body,
        arrayBuffer: async () => bytes.buffer as ArrayBuffer,
        httpMetadata: { contentType: row.mime as string },
      };
    },
    async delete(key) {
      await ready();
      await query("delete from asset_blobs where id = $1", [key]);
    },
  };
}
