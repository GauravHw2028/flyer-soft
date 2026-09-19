# Flyerly workspace notes

## Repository

This checkout is published to https://github.com/GauravHw2028/flyer-soft.git.
The default branch is `main` and `origin` already points at that repository.
Commit every finished change and push it to `origin main` as part of the same
piece of work, without waiting to be asked again.

## Verify before pushing

```text
npx tsc --noEmit
npm run build
```

`npm run lint` currently reports three known errors in `app/studio.tsx`
(`campaignRef` written during render, and two `setState` calls inside effects)
and the same pattern in `app/use-workspace.ts`. Do not add new ones.

## Product rules worth keeping

- The app owns its own workspace. There is no sign-in provider: routes read the
  owner id from `app/workspace-owner.ts`, and `.dev.vars` or the hosting runtime
  supplies `FLYERLY_OWNER_ID`, `FLYERLY_STORE_NAME` and `FLYERLY_CONTACT_EMAIL`.
  Do not reintroduce a third-party identity dependency without being asked.
- Product cards live in `app/flyer-layout.ts`. `slotRects()` is the template
  grid; `pageRects()` applies each product's saved `box` on top of it. Every
  renderer (base, artwork, Wear Mart) must read geometry from `pageRects()` so
  dragging a card moves it on the exported PNG and PDF too.
- Card text and image sizes are derived from the card's own width and height so
  a resized card still looks intentional.
- Wear Mart posters follow the client's printed format in `app/wear-flyer.ts`:
  masthead, offer line, themed hero, branch strip, dashed product cards with a
  price roundel, branch row and footer. Add a theme by extending `THEMES`.
- Arabic text in SVG anchors on its start edge, which sits on the right. Use
  `text-anchor="start"` at the right margin for right-aligned RTL copy.
- Sample product photos are transparent cutouts. Regenerate them with
  `python scripts/cutout-products.py` after replacing a source photo.
- Secrets (`FAL_KEY`, `FLYERLY_ADMIN_EMAILS`, `PAYMENT_INSTRUCTIONS`) belong in
  hosting runtime settings or the ignored `.dev.vars`, never in the repo.
- Storage has two backends in `app/server/`: Cloudflare D1/R2 when the Workers
  bindings exist, Postgres otherwise. `app/api/_shared.ts` picks per call. Keep
  the `pg` import lazy so the Workers bundle never evaluates a Node-only module.
- `next.config.ts` aliases `cloudflare:workers` to
  `build/cloudflare-workers-stub.ts` for the Vercel build. Do not remove that
  alias; the API routes stop building without it.
- The alias is skipped when `FLYERLY_RUNTIME=workers`, which `run-framework.mjs`
  and `build-verified.sh` set. vinext also honours resolve.alias, so without that
  flag the local app loses its D1 and R2 bindings.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
