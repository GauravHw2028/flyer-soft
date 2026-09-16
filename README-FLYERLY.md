# Flyerly — start here

The project includes the full app source, image assets, dependency lockfile, database migrations and business setup notes.

## Open the hosted pilot

https://flyerly-market-studio.kichalauji9.chatgpt.site

The site remains private. The site owner's account is configured as administrator. Open **Business admin → Open showcase flyer** to demonstrate Wear Mart. Switch between its ten styles under **Design**. Example products/prices are for demonstration.

## Run on Windows

Double-click **Start Flyerly.cmd**. It uses Node.js 22.13+ (24 recommended), installs dependencies when needed, applies local database migrations and starts http://localhost:5173. On this computer it can use the existing Codex Node runtime. The first installation needs Internet access.

Click **Sign in with ChatGPT** in the local app to activate its development-only `seedy@sites.test` account. Local product data is kept under `.wrangler/state` in this project folder. Stop the server with Ctrl+C before copying or backing up that directory. Do not run the Desktop copy and the original checkout on port 5173 at the same time.

For manual setup:

```text
npm ci
node scripts/setup-local.mjs
npm run dev
```

## Server configuration

Set these in hosting runtime settings, never in client-side code:

- `FLYERLY_ADMIN_EMAILS`: comma-separated verified sign-in emails allowed to manage businesses and approve credits. There is no automatic “first user becomes admin” rule.
- `FAL_KEY`: secret fal.ai API key. Enhancement is unavailable until this is configured.
- `PAYMENT_INSTRUCTIONS`: your actual bank/cash payment instructions and support contact.

For local development only, `scripts/setup-local.mjs` creates ignored `.dev.vars` with the local mock account as administrator. You may add a development API key there; never commit or share it. Secret values are excluded from the Desktop deliverable and archive.

Database migrations are in `drizzle/`. Hosting applies them during deployment. Credits use an append-only ledger with atomic D1 reservation batches; the balance is calculated from that ledger. Client input cannot set its own balance or administrator role.

## Useful source files

- `app/studio.tsx`: editor and campaign workflow.
- `app/business-ui.tsx`: business administration, credit requests, product slot popup and enhancement preview.
- `app/wear-mart.ts` and `app/wear-flyer.ts`: Wear Mart pack and editable rendering.
- `app/flyer.ts` and `app/flyer-layout.ts`: shared rendering, slot coordinates, QR codes and exports.
- `app/api/`: authenticated storage, business, credit and enhancement routes.
- `db/schema.ts` and `drizzle/`: database schema and migrations.
- `public/`: bundled sample product photos and Higgsfield artwork.

## Verification

```text
npx tsc --noEmit
npm run build
node scripts/smoke-test.mjs
node scripts/business-smoke-test.mjs
node scripts/credit-test.mjs
```

Smoke tests target localhost only and require the local administrator and an existing sample campaign. The business test creates explicitly labelled QA payment/account records; it is not a production payment test. Do not run it against the hosted site.

See **BUSINESS-PLAN.md** for the hosting decision, costs and remaining commercial-launch configuration. The project archive contains source and bundled assets, not a snapshot of the live hosted customer database or secret API keys.
