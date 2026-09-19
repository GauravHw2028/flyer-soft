import { z } from "zod";
import {
  accountCount,
  adoptLegacyWorkspace,
  createAccount,
  createSession,
  deleteSession,
  findAccountByEmail,
  verifyPassword,
} from "../../server/accounts";
import {
  clearedSessionCookie,
  requestIsSecure,
  sessionCookie,
  sessionToken,
} from "../../server/session";
import { db, failure, sameOrigin } from "../_shared";

const credentials = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  storeName: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const secure = requestIsSecure(req);

    if (body.action === "logout") {
      const token = await sessionToken();
      if (token) await deleteSession(token, db());
      return Response.json(
        { account: null },
        { headers: { "Set-Cookie": clearedSessionCookie(secure) } },
      );
    }

    const parsed = credentials.safeParse(body);
    if (!parsed.success)
      return Response.json(
        {
          error: "Enter a valid email address and a password of 8 characters or more.",
        },
        { status: 400 },
      );

    if (body.action === "signup") {
      const existing = await findAccountByEmail(parsed.data.email);
      if (existing)
        return Response.json(
          { error: "That email already has an account. Sign in instead." },
          { status: 409 },
        );

      const first = (await accountCount(db())) === 0;
      const account = await createAccount(
        {
          email: parsed.data.email,
          password: parsed.data.password,
          storeName: parsed.data.storeName || "My store",
        },
        db(),
      );
      // Only the very first account takes over the workspace that predates
      // accounts; later sign-ups start with an empty library.
      const adopted = first ? await adoptLegacyWorkspace(account.id, db()) : false;
      const { token } = await createSession(account.id, db());
      return Response.json(
        { account, adopted },
        { headers: { "Set-Cookie": sessionCookie(token, secure) } },
      );
    }

    if (body.action === "login") {
      const account = await findAccountByEmail(parsed.data.email);
      if (!account || !(await verifyPassword(parsed.data.password, account.passwordHash)))
        return Response.json(
          { error: "That email and password do not match." },
          { status: 401 },
        );
      const { token } = await createSession(account.id, db());
      return Response.json(
        {
          account: {
            id: account.id,
            email: account.email,
            storeName: account.storeName,
            created: account.created,
          },
        },
        { headers: { "Set-Cookie": sessionCookie(token, secure) } },
      );
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
