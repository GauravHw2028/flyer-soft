/**
 * `cloudflare:workers` is a runtime module: it only exists inside a Workers
 * bundle. The Next.js build (the one Vercel runs) resolves that specifier to
 * this stub instead, so configuration and bindings come from `process.env`.
 *
 * Storage code checks the shape of a binding before using it, which is why an
 * ordinary string here never gets mistaken for a D1 or R2 binding.
 */
export const env: Record<string, unknown> = process.env as unknown as Record<
  string,
  unknown
>;
