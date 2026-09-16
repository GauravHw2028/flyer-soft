import { createFalClient } from "@fal-ai/client";
import { z } from "zod";
import { db, bucket, sameOrigin, failure } from "../_shared";
import { identity, account, settings } from "../business-context";
type Job = {
  id: string;
  owner: string;
  source: string;
  status: string;
  request: string | null;
  result: string | null;
};
const model = "fal-ai/flux-kontext/dev";
function client() {
  return createFalClient({ credentials: settings().FAL_KEY! });
}
async function refund(id: string, reason: string) {
  await db().batch([
    db()
      .prepare(
        "INSERT OR IGNORE INTO credit_ledger (id,owner,delta,reason,created) SELECT ?,owner,1,?,? FROM enhancements WHERE id=? AND status IN ('reserved','queued')",
      )
      .bind("refund:" + id, reason, new Date().toISOString(), id),
    db()
      .prepare(
        "UPDATE enhancements SET status='refunded' WHERE id=? AND status IN ('reserved','queued')",
      )
      .bind(id),
  ]);
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await identity();
    if (!settings().FAL_KEY)
      return Response.json(
        {
          error:
            "AI enhancement is not connected yet. No credits were charged.",
        },
        { status: 503 },
      );
    const v = z
      .object({
        id: z.string().uuid(),
        source: z.string().regex(/^\/api\/assets\/[0-9a-f-]{36}$/),
      })
      .safeParse(await req.json());
    if (!v.success)
      return Response.json(
        { error: "Upload a product photo first." },
        { status: 400 },
      );
    const { id, source } = v.data;
    const existing = await db()
      .prepare("SELECT * FROM enhancements WHERE id=? AND owner=?")
      .bind(id, u.userId)
      .first<Job>();
    if (existing) return Response.json(existing);
    const asset = await db()
      .prepare("SELECT mime FROM assets WHERE id=? AND owner=?")
      .bind(source.split("/").pop(), u.userId)
      .first<{ mime: string }>();
    if (!asset || !asset.mime.startsWith("image/"))
      return Response.json(
        { error: "Product photo not found." },
        { status: 404 },
      );
    if ((await account(u.userId)) < 1)
      return Response.json(
        { error: "Recharge your AI credits before enhancing." },
        { status: 402 },
      );
    const object = await bucket().get(source.split("/").pop()!);
    if (!object) throw new Error("Missing source image");
    const bytes = new Uint8Array(await object.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const now = new Date().toISOString();
    try {
      await db().batch([
        db()
          .prepare(
            "INSERT INTO enhancements (id,owner,source,status,created) VALUES (?,?,?,'reserved',?)",
          )
          .bind(id, u.userId, source, now),
        db()
          .prepare(
            "INSERT INTO credit_ledger (id,owner,delta,reason,created) VALUES (?,?,-1,?,?)",
          )
          .bind("ai:" + id, u.userId, "Studio product photo", now),
      ]);
    } catch {
      return Response.json(
        {
          error:
            "Credit reservation failed. Refresh your balance and try again.",
        },
        { status: 409 },
      );
    }
    try {
      const result = await client().queue.submit(model, {
        input: {
          image_url: `data:${asset.mime};base64,${btoa(binary)}`,
          prompt:
            "Create a clean professional ecommerce studio photograph of this exact product. Remove the surrounding background and objects. Place the unchanged product on pure white with a soft natural contact shadow and even studio lighting. Preserve its packaging, proportions, brand, labels, colors and all printed text. Do not add props or invent details.",
          num_images: 1,
          output_format: "png",
          resolution_mode: "1:1",
          enable_safety_checker: true,
        },
      });
      await db()
        .prepare("UPDATE enhancements SET status='queued',request=? WHERE id=?")
        .bind(result.request_id, id)
        .run();
      return Response.json({ id, status: "queued" });
    } catch {
      await db()
        .prepare("UPDATE enhancements SET status='review' WHERE id=?")
        .bind(id)
        .run();
      return Response.json(
        {
          id,
          status: "review",
          error:
            "The provider did not confirm submission. Your reserved credit is flagged for administrator review; do not submit it again.",
        },
        { status: 202 },
      );
    }
  } catch (e) {
    return failure(e);
  }
}
export async function GET(req: Request) {
  try {
    const u = await identity(),
      id = new URL(req.url).searchParams.get("id");
    const job = await db()
      .prepare("SELECT * FROM enhancements WHERE id=? AND owner=?")
      .bind(id, u.userId)
      .first<Job>();
    if (!job) throw new Response("Not found", { status: 404 });
    if (job.status !== "queued" || !job.request) return Response.json(job);
    if (!settings().FAL_KEY)
      return Response.json(
        { error: "AI connection unavailable. Your job is saved." },
        { status: 503 },
      );
    const status = await client().queue.status(model, {
      requestId: job.request,
    });
    if (status.status !== "COMPLETED")
      return Response.json({ id, status: "queued" });
    let output: { images?: { url: string }[]; has_nsfw_concepts?: boolean[] };
    try {
      const result = await client().queue.result(model, {
        requestId: job.request,
      });
      output = result.data as typeof output;
    } catch {
      await refund(job.id, "AI provider could not deliver an image");
      return Response.json({ id, status: "refunded" });
    }
    if (output.has_nsfw_concepts?.some(Boolean) || !output.images?.[0]?.url) {
      await refund(job.id, "AI provider did not return a usable image");
      return Response.json({ id, status: "refunded" });
    }
    const url = new URL(output.images[0].url);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "fal.media" ||
        url.hostname.endsWith(".fal.media") ||
        url.hostname === "storage.googleapis.com"
      )
    )
      throw new Error("Unexpected AI image host");
    const image = await fetch(url, { redirect: "error" });
    if (!image.ok) throw new Error("Image download failed");
    const buffer = await image.arrayBuffer();
    if (buffer.byteLength > 8 * 1024 * 1024)
      throw new Error("AI image too large");
    const b = new Uint8Array(buffer);
    const mime =
      b[0] === 137 && b[1] === 80
        ? "image/png"
        : b[0] === 255 && b[1] === 216
          ? "image/jpeg"
          : "";
    if (!mime) throw new Error("Invalid AI image");
    const assetId = job.id;
    await bucket().put(assetId, buffer, {
      httpMetadata: { contentType: mime },
    });
    await db().batch([
      db()
        .prepare(
          "INSERT OR IGNORE INTO assets (id,owner,name,mime,size,created) VALUES (?,?,?,?,?,?)",
        )
        .bind(
          assetId,
          u.userId,
          "Studio product photo",
          mime,
          buffer.byteLength,
          new Date().toISOString(),
        ),
      db()
        .prepare(
          "UPDATE enhancements SET status='complete',result=? WHERE id=? AND status='queued'",
        )
        .bind("/api/assets/" + assetId, id),
    ]);
    return Response.json({
      id,
      status: "complete",
      result: "/api/assets/" + assetId,
    });
  } catch (e) {
    return failure(e);
  }
}
