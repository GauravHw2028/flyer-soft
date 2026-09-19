/**
 * Sign up, sign in and workspace isolation across accounts.
 *
 * Start the app against the same database first, for example:
 *   DATABASE_URL=postgres://... npm run dev:next
 *   node scripts/account-smoke-test.mjs
 *
 * The test wipes the app tables, so it refuses to run against a database that
 * is not local unless FLYERLY_ALLOW_REMOTE_TEST=1 is set.
 */
import assert from "node:assert/strict";
import pg from "pg";

const base = process.env.FLYERLY_TEST_URL || "http://localhost:3000";
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!connectionString)
  throw new Error("Set DATABASE_URL to the database the app is using.");
const host = new URL(connectionString).hostname;
if (
  !["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host) &&
  process.env.FLYERLY_ALLOW_REMOTE_TEST !== "1"
)
  throw new Error(
    `Refusing to wipe ${host}. Set FLYERLY_ALLOW_REMOTE_TEST=1 to test a remote database.`,
  );

const brand = {
  name: "Legacy store",
  address: "Old address",
  phone: "",
  currency: "AED",
  color: "#166534",
  logo: "",
  terms: "Terms",
};
const legacyWorkspace = {
  products: [],
  campaigns: [],
  brand,
  customTemplates: [],
};

const client = new pg.Client({ connectionString });
await client.connect();
// Let the app create its schema (including the account tables) before wiping.
for (let attempt = 0; attempt < 3; attempt++) {
  const ready = await fetch(base + "/api/session").catch(() => null);
  if (ready?.ok || ready?.status === 200) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
await client.query(
  "truncate workspaces, assets, asset_blobs, businesses, topups, credit_ledger, credit_accounts, enhancements, accounts, sessions",
);
// Simulate data saved before accounts existed.
await client.query(
  "insert into workspaces (owner, data, revision, updated) values ($1, $2, 1, $3)",
  ["owner", JSON.stringify(legacyWorkspace), new Date().toISOString()],
);
await client.end();

const call = async (path, options = {}) => {
  const response = await fetch(base + path, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter((value) => value.startsWith("flyerly_session="))
    .join("; ");
  return { status: response.status, body, cookie };
};
const auth = (action, payload, cookie) =>
  call("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
const workspace = (cookie, options = {}) =>
  call("/api/workspace", {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json", Origin: base } : {}),
      ...(cookie ? { cookie } : {}),
    },
  });

assert.equal((await call("/api/workspace")).status, 401, "signed out is rejected");
const session = await call("/api/session");
assert.equal(session.body.account, null);
assert.equal(session.body.accountsExist, false, "no accounts yet");

const first = await auth("signup", {
  email: "Owner@Store.com",
  password: "correct horse battery",
  storeName: "Wear Mart",
});
assert.equal(first.status, 200, JSON.stringify(first.body));
assert.equal(first.body.account.email, "owner@store.com", "email normalised");
assert.equal(first.body.adopted, true, "first account inherits the workspace");
assert.ok(first.cookie, "session cookie set");

const inherited = await workspace(first.cookie);
assert.equal(inherited.status, 200);
assert.equal(inherited.body.data.brand.name, "Legacy store", "legacy data kept");

const shortPassword = await auth("signup", {
  email: "short@store.com",
  password: "1234567",
});
assert.equal(shortPassword.status, 400, "short password rejected");

const duplicate = await auth("signup", {
  email: "owner@store.com",
  password: "another password",
});
assert.equal(duplicate.status, 409, "duplicate email rejected");

const second = await auth("signup", {
  email: "second@store.com",
  password: "second password",
  storeName: "Second store",
});
assert.equal(second.status, 200, JSON.stringify(second.body));
assert.equal(second.body.adopted, false, "later accounts inherit nothing");
const secondWorkspace = await workspace(second.cookie);
assert.equal(secondWorkspace.body.data, null, "new account starts empty");

const ownData = { ...legacyWorkspace, brand: { ...brand, name: "Second store" } };
assert.equal(
  (await workspace(second.cookie, {
    method: "PUT",
    body: JSON.stringify({ data: ownData, revision: 0 }),
  })).status,
  200,
  "second account can save",
);
const firstAgain = await workspace(first.cookie);
assert.equal(
  firstAgain.body.data.brand.name,
  "Legacy store",
  "accounts do not see each other",
);

const wrong = await auth("login", {
  email: "owner@store.com",
  password: "not the password",
});
assert.equal(wrong.status, 401, "wrong password rejected");

const login = await auth("login", {
  email: "OWNER@store.com",
  password: "correct horse battery",
});
assert.equal(login.status, 200, JSON.stringify(login.body));
assert.ok(login.cookie, "login sets a session");
assert.equal((await workspace(login.cookie)).status, 200);

const logout = await auth("logout", {}, login.cookie);
assert.equal(logout.status, 200);
assert.equal(
  (await workspace(login.cookie)).status,
  401,
  "session is gone after signing out",
);

console.log(
  "PASS: sign up, first-account adoption, isolation, duplicates, login and logout.",
);
