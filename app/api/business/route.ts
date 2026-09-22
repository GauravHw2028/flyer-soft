import { z } from "zod";
import { db, failure, sameOrigin } from "../_shared";
import { identity, account, settings } from "../business-context";
import { getAiConfig } from "../../server/ai";

export async function GET() {
  try {
    const u = await identity();
    const userEmail = u.email.toLowerCase();
    const rows = await db()
      .prepare("SELECT id,name,templates FROM businesses WHERE email=? ORDER BY created ASC")
      .bind(userEmail)
      .all<{ id: string; name: string; templates: string }>();

    const businesses = rows.results.map((b) => ({
      ...b,
      templates: JSON.parse(b.templates || "[]"),
    }));

    const balance = await account(u.userId);
    const topups = await db()
      .prepare(
        "SELECT id,credits,reference,status,created FROM topups WHERE owner=? ORDER BY created DESC LIMIT 30",
      )
      .bind(u.userId)
      .all();
    const ledger = await db()
      .prepare(
        "SELECT delta,reason,created FROM credit_ledger WHERE owner=? ORDER BY created DESC LIMIT 50",
      )
      .bind(u.userId)
      .all();

    const aiConfig = getAiConfig();

    return Response.json(
      {
        isAdmin: u.isAdmin,
        email: u.email,
        business: businesses[0] || null,
        businesses,
        balance,
        topups: topups.results,
        ledger: ledger.results,
        aiEnabled: aiConfig.hasOpenAi || aiConfig.hasFal || !!settings().FAL_KEY,
        hasOpenAi: aiConfig.hasOpenAi,
        paymentInstructions:
          settings().PAYMENT_INSTRUCTIONS ||
          "Contact your account manager for bank transfer or cash payment details. Submit the payment reference after paying. Credits are added after manual verification.",
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
    const u = await identity();
    const body = (await req.json().catch(() => ({}))) as { action?: string; name?: string; id?: string };

    if (body.action === "create") {
      const name = String(body.name || "").trim();
      if (!name || name.length > 80) {
        return Response.json({ error: "Enter a business name up to 80 characters." }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db()
        .prepare("INSERT INTO businesses (id, email, name, templates, created) VALUES (?, ?, ?, '[]', ?)")
        .bind(id, u.email.toLowerCase(), name, now)
        .run();

      return Response.json({ ok: true, business: { id, name, email: u.email, templates: [] } });
    }

    if (body.action === "update") {
      const v = z
        .object({
          id: z.string(),
          name: z.string().trim().min(1).max(80),
        })
        .safeParse(body);
      if (!v.success) return Response.json({ error: "Invalid business details" }, { status: 400 });

      await db()
        .prepare("UPDATE businesses SET name=? WHERE id=? AND email=?")
        .bind(v.data.name, v.data.id, u.email.toLowerCase())
        .run();

      return Response.json({ ok: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
