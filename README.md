# Flyerly

A private supermarket flyer studio with a persistent product library, image uploads, weekly campaigns, custom templates and downloadable flyers.

## Features

- Product CRUD, batch image uploads and CSV preview/import.
- Six starter templates plus saved custom color/grid templates.
- Campaign-specific product, price, brand and template snapshots.
- Autosave with revision checks, undo/redo, duplication and history.
- One SVG renderer for the preview and A4 multipage exports.
- 2480 x 3508 PNG, multipage A4 PDF and embedded-image SVG downloads.
- Platform sign-in, server-side owner scoping, D1 records and R2 files.
- Responsive workspace and read-only WebMCP flyer inspection.

## Development

Node 22.13+ is required. Install using `npm run install:ci`; start with `npm run dev`.

Local sign-in: `/signin-with-chatgpt?return_to=/`. Production identity is supplied by Sites. The local mock sign-in is excluded from production.

Generate schema changes with `npm run db:generate`. Build using `npm run build`, then apply pending SQL locally using the Wrangler config in `dist/server/wrangler.json` and persistence directory `.wrangler/state`. Sites applies migrations under `drizzle/` when publishing.

## Validation

`npx tsc --noEmit` checks types. After creating a sample campaign in the local UI, `node scripts/smoke-test.mjs` verifies authentication, image storage, validation, revision conflicts and campaign snapshots. This test refuses non-local URLs and restores the original local records afterwards.

## Data

Each validated workspace document is stored in D1 keyed by owner, with a revision. Compare-and-swap mutations prevent one tab from overwriting newer changes. Asset metadata is indexed by owner; bytes live in R2. Campaigns snapshot products, branding and templates.

## Pilot boundaries

This deployment is owner-private. Customer onboarding, paid subscriptions, shared store memberships, POS integrations and background removal are not included. PDF uses raster pages in RGB, with no bleed or CMYK preflight. SVG text stays scalable. Full Arabic and bilingual typesetting has not been verified. Images remain stored when a product is removed, preserving campaigns. Upload limit: 8 MB; export limit: 18 MB. Workspace backup downloads contain records and asset references, not copies of image bytes.

Photo sources: `public/products/SOURCES.md`. Sample names and prices are illustrative.
