import { currentAccount } from "../server/session";

export {
  bindings,
  bucket,
  db,
  failure,
  maxUploadBytes,
} from "../server/storage";

/** Every stored record belongs to the signed-in account. */
export async function owner() {
  const account = await currentAccount();
  if (!account)
    throw Response.json(
      { error: "Sign in to continue.", code: "sign_in_required" },
      { status: 401 },
    );
  return account.id;
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(req.url).origin)
  )
    throw new Response("Request origin rejected", { status: 403 });
}
