import { assignedArtwork } from "../template-assets";
import { owner, db, sameOrigin, failure } from "../_shared";
import { workspaceSchema } from "../../validation";

/**
 * The bundled sample photos were reshot as transparent PNGs so the grey studio
 * backdrop stops showing as a box on the flyer card. Workspaces saved before
 * that change still point at the JPEGs, so lift them onto the cutouts on read.
 */
function modernImage(path: string): string {
  return path.replace(/^\/products\/([a-z0-9-]+)\.jpg$/, "/products/$1.png");
}

function modernWorkspace<T extends Record<string, unknown>>(data: T): T {
  const products = (data.products as { image: string }[] | undefined) || [];
  const campaigns = (data.campaigns as {
    items: { image: string }[];
  }[] | undefined) || [];
  return {
    ...data,
    products: products.map((p) => ({ ...p, image: modernImage(p.image) })),
    campaigns: campaigns.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i, image: modernImage(i.image) })),
    })),
  };
}

export async function GET() {
  try {
    const id = await owner();
    const row = await db()
      .prepare("SELECT data, revision FROM workspaces WHERE owner = ?")
      .bind(id)
      .first<{ data: string; revision: number }>();
    return Response.json(
      row
        ? {
            data: modernWorkspace(JSON.parse(row.data)),
            revision: row.revision,
          }
        : { data: null, revision: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    sameOrigin(req);
    const id = await owner();
    const raw = await req.text();
    if (raw.length > 1500000)
      return Response.json(
        {
          error: "Workspace limit reached. Export and remove older campaigns.",
        },
        { status: 413 },
      );
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = workspaceSchema.safeParse(body.data);
    if (
      !parsed.success ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 0
    )
      return Response.json(
        {
          error: parsed.success
            ? "Invalid revision"
            : parsed.error.issues[0]?.message,
        },
        { status: 400 },
      );
    const images = new Set<string>();
    for (const t of [
      ...parsed.data.customTemplates,
      ...parsed.data.campaigns.map((c) => c.templateSnapshot).filter(Boolean),
    ])
      if (t?.artwork?.startsWith("/api/assets/"))
        images.add(t.artwork.split("/").pop()!);
    for (const p of parsed.data.products)
      if (p.image.startsWith("/api/assets/"))
        images.add(p.image.split("/").pop()!);
    for (const c of parsed.data.campaigns) {
      if (c.brand.logo.startsWith("/api/assets/"))
        images.add(c.brand.logo.split("/").pop()!);
      for (const p of c.items)
        if (p.image.startsWith("/api/assets/"))
          images.add(p.image.split("/").pop()!);
    }
    if (parsed.data.brand.logo.startsWith("/api/assets/"))
      images.add(parsed.data.brand.logo.split("/").pop()!);
    if (parsed.data.businesses) {
      for (const b of parsed.data.businesses) {
        if (b.profile?.logo?.startsWith("/api/assets/"))
          images.add(b.profile.logo.split("/").pop()!);
        for (const p of b.products || [])
          if (p.image?.startsWith("/api/assets/"))
            images.add(p.image.split("/").pop()!);
      }
    }
    if (images.size) {
      const rows = await db()
        .prepare("SELECT id FROM assets WHERE owner = ?")
        .bind(id)
        .all<{ id: string }>();
      const own = new Set([
        ...rows.results.map((r) => r.id),
        ...[...(await assignedArtwork())].map((x) => x.split("/").pop()!),
      ]);
      if ([...images].some((x) => !own.has(x)))
        return Response.json(
          { error: "An image does not belong to this workspace." },
          { status: 403 },
        );
    }
    const data = JSON.stringify(parsed.data),
      updated = new Date().toISOString();
    const result =
      body.revision === 0
        ? await db()
            .prepare(
              "INSERT OR IGNORE INTO workspaces (owner, data, revision, updated) VALUES (?, ?, 1, ?)",
            )
            .bind(id, data, updated)
            .run()
        : await db()
            .prepare(
              "UPDATE workspaces SET data = ?, revision = revision + 1, updated = ? WHERE owner = ? AND revision = ?",
            )
            .bind(data, updated, id, body.revision)
            .run();
    if (!result.meta.changes)
      return Response.json(
        {
          error:
            "This workspace changed in another tab. Download a backup of your edits, then reload.",
        },
        { status: 409 },
      );
    return Response.json({ revision: body.revision + 1 });
  } catch (e) {
    return failure(e);
  }
}
