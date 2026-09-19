import { cookies } from "next/headers";
import {
  accountForSession,
  accountCount,
  type Account,
} from "./accounts";
import { db } from "./storage";

export const SESSION_COOKIE = "flyerly_session";
const SESSION_SECONDS = 60 * 24 * 60 * 60;

export async function sessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

/** The signed-in account, or null when nobody is signed in. */
export async function currentAccount(): Promise<Account | null> {
  const token = await sessionToken();
  if (!token) return null;
  return accountForSession(token, db());
}

export async function signedIn(): Promise<boolean> {
  return Boolean(await currentAccount());
}

export async function anyAccounts(): Promise<boolean> {
  return (await accountCount(db())) > 0;
}

export function sessionCookie(token: string, secure: boolean) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearedSessionCookie(secure: boolean) {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function requestIsSecure(request: Request) {
  return (
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}
