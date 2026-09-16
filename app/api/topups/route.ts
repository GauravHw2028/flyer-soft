import { z } from "zod";
import { db, failure, sameOrigin } from "../_shared";
import { identity } from "../business-context";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await identity();
    const body = z
      .object({
        id: z.string().uuid(),
        credits: z.number().int().min(1).max(10000),
        reference: z.string().trim().min(3).max(250),
      })
      .safeParse(await req.json());
    if (!body.success)
      return Response.json(
        { error: "Enter a payment reference and 1–10,000 credits." },
        { status: 400 },
      );
    const b = body.data;
    const count = await db()
      .prepare(
        "SELECT COUNT(*) AS n FROM topups WHERE owner=? AND status='pending'",
      )
      .bind(u.userId)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 5)
      return Response.json(
        { error: "You already have five requests awaiting review." },
        { status: 429 },
      );
    await db()
      .prepare(
        "INSERT OR IGNORE INTO topups (id,owner,email,credits,reference,status,created) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        b.id,
        u.userId,
        u.email,
        b.credits,
        b.reference,
        "pending",
        new Date().toISOString(),
      )
      .run();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
