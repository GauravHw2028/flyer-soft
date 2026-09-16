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

- Product cards live in `app/flyer-layout.ts`. `slotRects()` is the template
  grid; `pageRects()` applies each product's saved `box` on top of it. Every
  renderer (base, artwork, Wear Mart) must read geometry from `pageRects()` so
  dragging a card moves it on the exported PNG and PDF too.
- Card text and image sizes are derived from the card's own width and height so
  a resized card still looks intentional.
- Secrets (`FAL_KEY`, `FLYERLY_ADMIN_EMAILS`, `PAYMENT_INSTRUCTIONS`) belong in
  hosting runtime settings or the ignored `.dev.vars`, never in the repo.
