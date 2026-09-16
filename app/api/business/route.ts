import { db, failure } from "../_shared";
import { identity, account, settings } from "../business-context";
export async function GET() {
  try {
    const u = await identity();
    const business = await db()
      .prepare("SELECT id,name,templates FROM businesses WHERE email=?")
      .bind(u.email.toLowerCase())
      .first<{ id: string; name: string; templates: string }>();
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
    return Response.json(
      {
        isAdmin: u.isAdmin,
        email: u.email,
        business: business
          ? { ...business, templates: JSON.parse(business.templates) }
          : null,
        balance,
        topups: topups.results,
        ledger: ledger.results,
        aiEnabled: !!settings().FAL_KEY,
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
