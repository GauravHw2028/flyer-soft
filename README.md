# Flyerly

A private supermarket flyer studio with a persistent product library, image uploads, weekly campaigns, custom templates and downloadable flyers.

## Features

- Product CRUD, batch image uploads and CSV preview/import.
- Nine starter templates, including three layouts with Higgsfield artwork, plus saved custom color/grid templates.
- Thirteen Wear Mart poster layouts built from the client's printed format: masthead, offer line, themed hero, dashed product cards with price roundels, branch row and footer.
- Campaign-specific product, price, brand and template snapshots.
- Free card layout: any product card can be dragged, resized and given a different size from the others.
- Bundled sample products are transparent cutouts, so photos sit on the card instead of showing their studio backdrop.
- Autosave with revision checks, undo/redo, duplication and history.
- One SVG renderer for the preview and A4 multipage exports.
- 2480 x 3508 PNG, multipage A4 PDF and embedded-image SVG downloads.
- Self-owned install: one workspace per install, no third-party identity provider.
- Responsive workspace and read-only WebMCP flyer inspection.

## Development

Node 22.13+ is required. Install using `npm run install:ci`; start with `npm run dev`.

There is no sign-in step. The app reads and writes its own workspace directly.
Set `FLYERLY_OWNER_ID` when one database serves more than one install, and
`FLYERLY_STORE_NAME` / `FLYERLY_CONTACT_EMAIL` to label that owner.

Regenerate the transparent sample product photos with
`python scripts/cutout-products.py`.

Generate schema changes with `npm run db:generate`. Build using `npm run build`, then apply pending SQL locally using the Wrangler config in `dist/server/wrangler.json` and persistence directory `.wrangler/state`. Sites applies migrations under `drizzle/` when publishing.

## Validation

`npx tsc --noEmit` checks types. After creating a sample campaign in the local UI, `node scripts/smoke-test.mjs` verifies image storage, validation, revision conflicts and campaign snapshots. This test refuses non-local URLs and restores the original local records afterwards.

## Data

Each validated workspace document is stored in D1 keyed by owner, with a revision. Compare-and-swap mutations prevent one tab from overwriting newer changes. Asset metadata is indexed by owner; bytes live in R2. Campaigns snapshot products, branding and templates.

## Pilot boundaries

This deployment is owner-private. Customer onboarding, paid subscriptions, shared store memberships, POS integrations and background removal are not included. PDF uses raster pages in RGB, with no bleed or CMYK preflight. SVG text stays scalable. Full Arabic and bilingual typesetting has not been verified. Images remain stored when a product is removed, preserving campaigns. Upload limit: 8 MB; export limit: 18 MB. Workspace backup downloads contain records and asset references, not copies of image bytes.

Photo sources: `public/products/SOURCES.md`. Sample names and prices are illustrative.

