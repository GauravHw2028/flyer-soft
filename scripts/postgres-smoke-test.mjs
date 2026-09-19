/**
 * End-to-end check of the Postgres storage path used on Vercel.
 *
 * Start the app against the same database first, for example:
 *   DATABASE_URL=postgres://... npm run dev:next
 *   node scripts/postgres-smoke-test.mjs
 *
 * The test truncates the app tables, so it refuses to run against anything that
 * is not a local database unless FLYERLY_ALLOW_REMOTE_TEST=1 is set.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pg from "pg";

const base = process.env.FLYERLY_TEST_URL || "http://localhost:3000";
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!connectionString)
  throw new Error("Set DATABASE_URL to the database the app is using.");

const host = new URL(connectionString).hostname;
const local = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(
  host,
);
if (!local && process.env.FLYERLY_ALLOW_REMOTE_TEST !== "1")
  throw new Error(
    `Refusing to wipe ${host}. Set FLYERLY_ALLOW_REMOTE_TEST=1 to test a remote database.`,
  );

const brand = {
  name: "وير مارت Wear Mart",
  address: "Offers available in all 3 branches",
  phone: "+971 50 000 0000",
  currency: "AED",
  color: "#126573",
  logo: "",
  terms: "Offers valid while stocks last. Images are for illustration.",
  arabicName: "وير مارت",
  timings: "All branches · 9:00 AM to 2:00 AM",
  locationUrl: "",
  branches: [{ name: "Branch 1", address: "Add branch address", url: "" }],
};
const product = {
  id: "p-1",
  name: "Fresh bananas",
  arabicName: "موز طازج",
  pack: "1 kg",
  category: "Fruit",
  price: 8.99,
  image: "/products/bananas.png",
  sku: "",
};
const workspace = {
  products: [product],
  campaigns: [
    {
      id: "c-1",
      name: "Wear Mart · Client showcase",
      headline: "Back to school",
      start: "2026-09-18",
      end: "2026-09-24",
      template: "wear-school",
      items: [{ ...product, offer: 4.99, badge: "", slot: 0 }],
      brand,
      updated: new Date().toISOString(),
      status: "draft",
    },
  ],
  brand,
  customTemplates: [],
};

const client = new pg.Client({ connectionString });
await client.connect();
await client.query(
  "truncate workspaces, assets, asset_blobs, businesses, topups, credit_ledger, credit_accounts, enhancements, accounts, sessions",
);
await client.end();

let cookie = "";

const json = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  const setCookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter((value) => value.startsWith("flyerly_session="))
    .join("; ");
  return { status: response.status, body, setCookie };
};
const send = (method, body) =>
  json("/api/workspace", {
    method,
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(body),
  });

// An account has to exist before any storage route answers.
const signup = await json("/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({
    action: "signup",
    email: "storage-test@example.com",
    password: "storage test password",
    storeName: "Storage test",
  }),
});
assert.equal(signup.status, 200, `sign up: ${JSON.stringify(signup.body)}`);
cookie = signup.setCookie;
assert.ok(cookie, "session cookie");
const accountId = signup.body.account.id;

const empty = await json("/api/workspace");
assert.equal(empty.status, 200, "workspace read");
assert.equal(empty.body.data, null, "fresh database is empty");

const first = await send("PUT", { data: workspace, revision: 0 });
assert.equal(first.status, 200, `workspace write: ${JSON.stringify(first.body)}`);
assert.equal(first.body.revision, 1);

const loaded = await json("/api/workspace");
assert.equal(loaded.body.data.brand.arabicName, "وير مارت", "Arabic round trip");
assert.equal(loaded.body.data.campaigns[0].name, "Wear Mart · Client showcase");

const stale = await send("PUT", { data: workspace, revision: 0 });
assert.equal(stale.status, 409, "stale revision rejected");

const bytes = await readFile(
  new URL("../public/products/bananas.png", import.meta.url),
);
const form = new FormData();
form.append("file", new File([bytes], "bananas.png", { type: "image/png" }));
const upload = await fetch(base + "/api/assets", {
  method: "POST",
  headers: { Origin: base, cookie },
  body: form,
});
assert.equal(upload.status, 200, `upload: ${await upload.clone().text()}`);
const asset = await upload.json();

const image = await fetch(base + asset.url, { headers: { cookie } });
assert.equal(image.status, 200);
assert.equal(
  new Uint8Array(await image.arrayBuffer()).length,
  bytes.length,
  "stored image round trip",
);

const withAsset = structuredClone(workspace);
withAsset.products[0].image = asset.url;
const saved = await send("PUT", { data: withAsset, revision: 1 });
assert.equal(saved.status, 200, `workspace with asset: ${JSON.stringify(saved.body)}`);

const foreign = structuredClone(workspace);
foreign.products[0].image = "/api/assets/00000000-0000-4000-8000-000000000001";
assert.equal((await send("PUT", { data: foreign, revision: 2 })).status, 403);

const crossOrigin = await fetch(base + "/api/workspace", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://foreign.example",
    cookie,
  },
  body: JSON.stringify({ data: workspace, revision: 2 }),
});
assert.equal(crossOrigin.status, 403, "cross-origin mutation rejected");

const business = await json("/api/business");
assert.equal(business.status, 200, JSON.stringify(business.body));
assert.equal(business.body.isAdmin, true);
assert.equal(business.body.balance, 0);

const admin = await json("/api/admin");
assert.equal(admin.status, 200);
assert.ok(Array.isArray(admin.body.businesses) && Array.isArray(admin.body.topups));

const topupId = crypto.randomUUID();
assert.equal(
  (
    await json("/api/topups", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ id: topupId, credits: 5, reference: "QA-TRANSFER-1" }),
    })
  ).status,
  200,
);
assert.equal((await json("/api/business")).body.balance, 0, "pending top-up credits nothing");

assert.equal(
  (
    await json("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ action: "review", id: topupId, decision: "approve" }),
    })
  ).status,
  200,
);
const funded = await json("/api/business");
assert.equal(funded.body.balance, 5, "approved top-up credits the balance");
assert.equal(funded.body.topups[0].status, "approved");

await json("/api/admin", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({ action: "review", id: topupId, decision: "approve" }),
});
assert.equal((await json("/api/business")).body.balance, 5, "approval is idempotent");

const restore = await send("PUT", {
  data: workspace,
  revision: saved.body.revision,
});
assert.equal(restore.status, 200, "restore workspace");

// The ledger guard must refuse a debit that would take the balance negative.
const ledger = new pg.Client({ connectionString });
await ledger.connect();
let guard = "";
try {
  await ledger.query(
    "insert into credit_ledger (id, owner, delta, reason, created) values ($1, $2, -99, $3, $4)",
    [crypto.randomUUID(), accountId, "QA overdraw", new Date().toISOString()],
  );
} catch (error) {
  guard = String(error.message);
}
const after = await ledger.query(
  "select coalesce(sum(delta),0)::int as balance from credit_ledger where owner = $1",
  [accountId],
);
await ledger.end();
assert.match(guard, /Insufficient credits/, "overdraw blocked");
assert.equal(after.rows[0].balance, 5, "balance untouched after a blocked debit");

console.log(
  "PASS: workspace, Arabic round trip, revisions, asset storage, ownership, credits and guard.",
);
