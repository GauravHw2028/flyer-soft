import { anyAccounts, currentAccount } from "../../server/session";
import { failure } from "../_shared";

/** Who is signed in, and whether this install has any account yet. */
export async function GET() {
  try {
    const [account, accountsExist] = await Promise.all([
      currentAccount(),
      anyAccounts(),
    ]);
    return Response.json(
      { account, accountsExist },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
