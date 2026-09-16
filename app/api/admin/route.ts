import { z } from "zod";
import { db, failure, sameOrigin } from "../_shared";
import { admin, account } from "../business-context";
import { templateSchema } from "../../validation";
export async function GET() {
  try {
    await admin();
    const [businesses, topups, jobs] = await Promise.all([
      db().prepare("SELECT * FROM businesses ORDER BY created DESC").all<{
        id: string;
        email: string;
        name: string;
        templates: string;
        created: string;
      }>(),
      db()
        .prepare("SELECT * FROM topups WHERE status='pending' ORDER BY created")
        .all(),
      db()
        .prepare(
          "SELECT id,owner,status,created FROM enhancements WHERE (status='review' OR (status='reserved' AND julianday(created)<julianday('now','-10 minutes')) OR (status='queued' AND julianday(created)<julianday('now','-1 hour'))) ORDER BY created",
        )
        .all(),
    ]);
    return Response.json(
      {
        businesses: businesses.results.map((b) => ({
          ...b,
          templates: JSON.parse(b.templates),
        })),
        topups: topups.results,
        jobs: jobs.results,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await admin();
    const raw = await req.text();
    if (raw.length > 100000) return new Response("Too large", { status: 413 });
    const b = JSON.parse(raw);
    if (b.action === "business") {
      const v = z
        .object({
          id: z.string().uuid(),
          name: z.string().trim().min(1).max(60),
          email: z.string().email().max(200),
          templates: z.array(templateSchema).max(10),
        })
        .safeParse(b);
      if (!v.success)
        return Response.json(
          {
            error:
              "Enter a valid business, email and no more than 10 templates.",
          },
          { status: 400 },
        );
      const d = v.data;
      if (new Set(d.templates.map((t) => t.id)).size !== d.templates.length)
        return Response.json(
          { error: "Template IDs must be unique." },
          { status: 400 },
        );
      const refs = d.templates
        .map((t) => t.artwork)
        .filter((a): a is string => !!a?.startsWith("/api/assets/"));
      for (const ref of refs) {
        const owned = await db()
          .prepare("SELECT id FROM assets WHERE id=? AND owner=?")
          .bind(ref.split("/").pop(), u.userId)
          .first();
        if (!owned)
          return Response.json(
            {
              error: "Template artwork must be uploaded by this administrator.",
            },
            { status: 403 },
          );
      }
      await db()
        .prepare(
          "INSERT INTO businesses (id,email,name,templates,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,templates=excluded.templates",
        )
        .bind(
          d.id,
          d.email.toLowerCase(),
          d.name,
          JSON.stringify(d.templates),
          new Date().toISOString(),
        )
        .run();
      return Response.json({ ok: true });
    }
    if (
      b.action === "review" &&
      typeof b.id === "string" &&
      ["approve", "reject"].includes(b.decision)
    ) {
      const t = await db()
        .prepare("SELECT * FROM topups WHERE id=?")
        .bind(b.id)
        .first<{ owner: string; credits: number; status: string }>();
      if (!t) throw new Response("Request not found", { status: 404 });
      await account(t.owner);
      const now = new Date().toISOString();
      await db().batch([
        db()
          .prepare(
            "INSERT OR IGNORE INTO credit_ledger (id,owner,delta,reason,created) SELECT ?,owner,credits,?,? FROM topups WHERE id=? AND status='pending' AND ?='approve'",
          )
          .bind(
            "topup:" + b.id,
            "Manual payment verified by " + u.email,
            now,
            b.id,
            b.decision,
          ),
        db()
          .prepare(
            "UPDATE topups SET status=?,reviewer=? WHERE id=? AND status='pending'",
          )
          .bind(
            b.decision === "approve" ? "approved" : "rejected",
            u.email,
            b.id,
          ),
      ]);
      return Response.json({ ok: true });
    }
    if (b.action === "refund" && typeof b.id === "string") {
      await db().batch([
        db()
          .prepare(
            "INSERT OR IGNORE INTO credit_ledger (id,owner,delta,reason,created) SELECT ?,owner,1,?,? FROM enhancements WHERE id=? AND (status='review' OR (status='reserved' AND julianday(created)<julianday('now','-10 minutes')) OR (status='queued' AND julianday(created)<julianday('now','-1 hour')))",
          )
          .bind(
            "refund:" + b.id,
            "AI reservation refunded by " + u.email,
            new Date().toISOString(),
            b.id,
          ),
        db()
          .prepare(
            "UPDATE enhancements SET status='refunded' WHERE id=? AND (status='review' OR (status='reserved' AND julianday(created)<julianday('now','-10 minutes')) OR (status='queued' AND julianday(created)<julianday('now','-1 hour')))",
          )
          .bind(b.id),
      ]);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Invalid admin action" }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
