# Flyerly business edition

## Recommended starting point

Sell the web app first. Your service depends on centrally assigning custom templates, updating designs and controlling prepaid AI credits. A Windows-only database would reduce central storage, but each installation would need backups, upgrades and recovery. AI enhancement and trustworthy prepaid credits still need an online server; shipping a secret API key or an editable credit balance inside a desktop app would expose your account to abuse.

Use a setup fee for designing the customer's 10-template pack, an ongoing subscription for the editor/library, and separate prepaid AI credits. Decide those selling prices after measuring support time and actual image usage. Manual bank transfers or cash receipts can support the pilot without a payment processor.

## Storage costs

Keep image files in object storage and product/campaign records in the database. Do not store base64 photographs inside database rows. This app follows that separation.

For an independently billed Cloudflare deployment, R2 Standard currently lists $0.015 per GB-month and 10 GB-month of free storage. An illustrative 100 businesses × 500 photos × 1 MB is about 50 GB, approximately $0.60/month for the storage above that allowance. This excludes original/enhanced duplicates, PDF exports, request charges, compute, backups, domains and AI. It is an illustration, not a quote for the current Sites hosting service. Sources checked 16 September 2026: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

D1 lists 5 GB of database storage included on its paid plan, with additional storage at $0.75/GB-month and separate usage allowances. Photos will normally be the larger storage component. Add usage limits and image optimization as the customer base grows.

The enhancement integration uses fal.ai FLUX.1 Kontext dev, an image-editing model. [Its launch announcement](https://blog.fal.ai/announcing-flux-1-kontext-dev-inference-training/) quoted $0.025/megapixel; that historical number is only a planning reference. Check your live [provider pricing](https://fal.ai/models/fal-ai/flux-kontext/dev) before setting retail credit prices. The app currently spends one internal credit per enhancement, not one dollar or one provider credit. [API documentation](https://fal.ai/models/fal-ai/flux-kontext/dev/api).

## Delivered pilot

- Saved product library, image uploads, CSV import, campaign snapshots and weekly duplication.
- Nine shared designs, including three layouts using the generated Higgsfield bakery artwork.
- Ten Wear Mart designs, including editable Paper Adventure and Back to School recreations inspired by the supplied references. The other eight are variations in palette, theme and product density.
- Administrator-managed businesses identified by the customer's sign-in email, with up to 10 private templates. Admins can rename/recolor designs, add shared layouts to a private pack and upload header artwork. Uploaded artwork uses the designed header area; this is not a Photoshop PSD importer or a freeform page designer.
- Click a flyer card to open product autocomplete, set its new price and optionally display its old price. Empty slots can be filled and cleared without shifting other cards.
- Store and branch location links generate QR codes locally. No external QR image service is required.
- Manual credit recharge requests, payment verification, ledger history, one-time approvals and guarded debits.
- Server-side image enhancement submission/polling and before/after acceptance. Missing API configuration prevents charges. Provider failures refund the reserved credit; ambiguous submissions are flagged for admin review.
- A4 PDF, PNG and embedded-image SVG exports.

## Before accepting paying customers

1. Configure the server-only `FAL_KEY` in hosting settings and fund your own fal.ai account. Run a real enhancement with representative product packaging and confirm its cost, quality and failure handling. No provider key was supplied, so a live paid generation has not been tested.
2. Configure `PAYMENT_INSTRUCTIONS` with your actual business payment instructions, agreed credit pricing and support contact. Never treat a reference number alone as proof of payment.
3. Each install owns its workspace directly, so there is no platform sign-in and no separate account list to keep in sync. Selling this to several businesses means running one install (or one owner id) per business until a real multi-tenant account layer, team seats and self-service subscriptions are built.
4. Add each customer's verified sign-in email under Business admin and assign their private pack. Set their real location links, branch details, brand logo and products. The Wear Mart showcase uses clearly labelled sample produce and placeholder branch addresses because original product photos and verified location links were not supplied.
5. Schedule database and file backups, agree retention terms and exercise restoration. Files are stored persistently without an automatic expiry, but a promise to keep images “forever” requires a funded retention policy and backups.
6. Before broader launch, add per-customer storage quotas, usage reporting, support processes and monitoring. Keep administrator accounts tightly limited. Do not expose the local development mock sign-in server to the Internet.

## Future Windows option

If customers require reliable offline editing, reuse this React editor in a Tauri or Electron shell, put products and drafts in SQLite with a local image folder, and synchronize custom templates when online. Continue running credit verification and the AI proxy on your server. Offer automatic encrypted backups or a customer-managed backup destination. The saved Desktop project is the complete web-app source, not a compiled Windows installer.
