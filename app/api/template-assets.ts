import { identity } from "./business-context";
import { db } from "./_shared";
export async function assignedArtwork() {
  const u = await identity();
  const row = await db()
    .prepare("SELECT templates FROM businesses WHERE email=?")
    .bind(u.email.toLowerCase())
    .first<{ templates: string }>();
  const saved = await db()
    .prepare("SELECT data FROM workspaces WHERE owner=?")
    .bind(u.userId)
    .first<{ data: string }>();
  const campaigns = saved ? JSON.parse(saved.data).campaigns || [] : [];
  return new Set<string>(
    [
      ...(row ? JSON.parse(row.templates) : []).map(
        (t: { artwork?: string }) => t.artwork,
      ),
      ...campaigns.map(
        (c: { templateSnapshot?: { artwork?: string } }) =>
          c.templateSnapshot?.artwork,
      ),
    ].filter(Boolean),
  );
}
