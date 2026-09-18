# Flyerly — start here

The project includes the full app source, image assets, dependency lockfile, database migrations and business setup notes.

## Two ways to run the same app

- **On this computer** (`Start Flyerly.cmd`) it builds with vinext and keeps data
  in Cloudflare D1 and R2 under `.wrangler/state`. Nothing to configure.
- **On Vercel** it runs `next build` and keeps data in Postgres. Storage is chosen
  per request: the D1/R2 bindings when the Workers runtime provides them, and
  Postgres otherwise.

## Open the hosted pilot

Open **Business admin → Open showcase flyer** to demonstrate Wear Mart. Switch
between its layouts under **Design → Find your look**. Example products and
prices are for demonstration.

## Run on Windows

Double-click **Start Flyerly.cmd**. It uses Node.js 22.13+ (24 recommended), installs dependencies when needed, applies local database migrations and starts http://localhost:5173. On this computer it can use the existing Codex Node runtime. The first installation needs Internet access.

There is no sign-in: the app opens straight into its own workspace. Local
product data is kept under `.wrangler/state` in this project folder. Stop the
server with Ctrl+C before copying or backing up that directory. Do not run the
Desktop copy and the original checkout on port 5173 at the same time.

For manual setup:

```text
npm ci
node scripts/setup-local.mjs
npm run dev
```

## Server configuration

Set these in hosting runtime settings, never in client-side code:

- `FLYERLY_OWNER_ID`: workspace key for this install. Change it when more than one install shares a database.
- `FLYERLY_STORE_NAME`, `FLYERLY_CONTACT_EMAIL`: how this install is labelled in the business screens.
- `DATABASE_URL`: Postgres connection string. Required on Vercel, ignored locally.
- `FLYERLY_MAX_UPLOAD_MB`: override the upload ceiling (4 MB on Vercel, 8 MB locally).
- `FAL_KEY`: secret fal.ai API key. Enhancement is unavailable until this is configured.
- `PAYMENT_INSTRUCTIONS`: your actual bank/cash payment instructions and support contact.

The install owner is the administrator, so there is no separate admin list.

## Hosting on Vercel

`vercel.json` pins the framework to Next.js and the build to `next build`, which
is the piece that used to fail: the API routes import `cloudflare:workers`, and
Vercel resolves that specifier to `build/cloudflare-workers-stub.ts` instead.

1. Import the repository at vercel.com. No build settings to change.
2. Add a Postgres database (Vercel Postgres, Neon or Supabase) and set
   `DATABASE_URL`. Tables, indexes and the credit ledger triggers are created on
   the first request, so there is no migration step.
3. Optionally set the owner, store, AI and payment variables listed above.

Move existing local work over with the importer, which reads either the app's
JSON backup or the local D1 file directly:

```text
DATABASE_URL=postgres://... node scripts/import-workspace.mjs flyerly-workspace-backup.json
DATABASE_URL=postgres://... node scripts/import-workspace.mjs .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<id>.sqlite
```

Vercel rejects function request bodies above 4.5 MB, so uploads are capped at
4 MB there and exports download straight from the browser as well as being kept
in the workspace when they fit. Image bytes live in Postgres (`asset_blobs`), so
one integration is enough to run; swap in Vercel Blob if storage grows.

For local development only, `scripts/setup-local.mjs` creates ignored `.dev.vars` with the local mock account as administrator. You may add a development API key there; never commit or share it. Secret values are excluded from the Desktop deliverable and archive.

Database migrations are in `drizzle/`. Hosting applies them during deployment. Credits use an append-only ledger with atomic D1 reservation batches; the balance is calculated from that ledger. Client input cannot set its own balance or administrator role.

## Useful source files

- `app/studio.tsx`: editor and campaign workflow.
- `app/flyer-layout.ts`: page geometry. `slotRects()` is the template grid and
  `pageRects()` applies each card's saved free position on top of it.
- `app/business-ui.tsx`: business administration, credit requests, product slot popup and enhancement preview.
- `app/wear-mart.ts` and `app/wear-flyer.ts`: Wear Mart pack and editable rendering.
- `app/flyer.ts` and `app/flyer-layout.ts`: shared rendering, slot coordinates, QR codes and exports.
- `app/api/`: authenticated storage, business, credit and enhancement routes.
- `db/schema.ts` and `drizzle/`: database schema and migrations.
- `public/`: bundled sample product photos and Higgsfield artwork.

## Card layout

**Arrange cards** turns the canvas into a layout editor. Drag a card to move it,
pull one of its eight handles to resize it, or use the arrow keys (hold Shift
for bigger steps). Card text, images and price tags size themselves from the
card, so a large card reads as a hero and a small one stays legible. **Even
grid** puts every card back on the template grid.

Each card's position is stored as `box` on its campaign item, clamped to the
page, and is used by the on-screen preview and by the PNG, PDF and SVG exports.

## Verification

```text
npx tsc --noEmit
npm run build          # Next.js build, the one Vercel runs
npm run build:workers  # vinext/Cloudflare build for the local and Sites path
node scripts/smoke-test.mjs
node scripts/business-smoke-test.mjs
node scripts/credit-test.mjs
```

`scripts/postgres-smoke-test.mjs` covers the Vercel storage path. Start the app
with `DATABASE_URL` set, then run it; it wipes the app tables, so it refuses any
database that is not local unless `FLYERLY_ALLOW_REMOTE_TEST=1` is set.

Smoke tests target localhost only and require the local administrator and an existing sample campaign. The business test creates explicitly labelled QA payment/account records; it is not a production payment test. Do not run it against the hosted site.

See **BUSINESS-PLAN.md** for the hosting decision, costs and remaining commercial-launch configuration. The project archive contains source and bundled assets, not a snapshot of the live hosted customer database or secret API keys.
