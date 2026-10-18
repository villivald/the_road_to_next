# Hosted checkpoint — 17 October 2026

Step 1 completed on 18 October after the signed-in browser follow-up below.
The infrastructure observations in the original sections were collected on
17 October. No redeployment, migration, provider configuration change, payment,
or email send was needed or performed by this review.

## Deployment and configuration

- Public origin: `https://wishlistfi.vercel.app`.
- Deployment: `dpl_BGdsV33zM2udkCgW7WjzZgSdd83a`, ready, Vercel production target.
- Deployed and local commit: `fbaf9f140a5cbd9d4990c4320761f87e2e4b9fe9`
  (`add branded emails`, branch `main`).
- Repository root selected; Next.js preset, Node 24, `npm ci`, default build
  command, Frankfurt functions, and Fluid Compute enabled.
- The deployment includes app URL, sender, Resend, private Blob, Paddle, and
  Inngest configuration keys. Neither `MAILPIT_URL` nor `INNGEST_DEV` is present.
  Sensitive values are not downloadable; key presence alone does not prove
  delivery or payment behavior. The deployed code still rejects live billing.
- Connected Neon resource: `wishlist-db`, available, Frankfurt. The database's
  `neon.project_id` matches the resource attached to this Vercel project.
- Connected Blob store: `wishlist-development`, available, **private**, Stockholm.
  The existing local cloud reference matches the connected Blob store ID.
- Preview and production targets currently share these sandbox resources.
  Separate live resources remain required before the live-billing cutover.

## Database and media

Read-only database transactions verified all 12 committed migrations as applied,
with matching SHA-256 checksums and no missing migration. This includes:

- `20261014000100_responsive_private_media`
- `20261014000200_account_emails`

All four media rows use Vercel storage. Zero attached images await variant
backfill, and zero detached rows await cleanup. No backfill was rerun.

The account-email table exists and currently has zero rows: no pending or failed
messages, but also no evidence yet of a delivered welcome/Premium/promo guide.
Actual delivery remains Step 2 acceptance work.

## Background jobs

The Inngest production environment is synced to this exact deployment. Its latest
app sync succeeded on 16 October. All five expected functions are registered:

| Function                   | Schedule           | Observed execution          |
| -------------------------- | ------------------ | --------------------------- |
| `deliver-list-invitations` | Every five minutes | Latest three runs completed |
| `cleanup-media`            | Every five minutes | Latest three runs completed |
| `reconcile-paddle-billing` | Every five minutes | Latest three runs completed |
| `deliver-account-emails`   | Every five minutes | Latest three runs completed |
| `expire-auth-data`         | Daily at 03:00 UTC | 17 October run completed    |

The failed-run query returned no runs for Wishlist in the preceding 24 hours.
The latest invitation, media, billing, and account-email runs also returned
`failed: 0` in their result counters; their queues had no work in those runs.
Successful job execution does not replace the delivery, payment, or recovery
journeys in Steps 2–3.

## HTTP smoke checks

- English/Finnish home, sign-in, Browse, and Premium pages returned HTTP 200,
  correct HTML language attributes, and no detected server-exception page.
- Signed-out `/en/lists` and `/fi/account/plan` redirected to the matching
  language's sign-in page.
- `/email-brand.png` returned HTTP 200 with a PNG body (5,572 bytes).
- A public image and its 400 px variant returned HTTP 200 with WebP bodies and
  `private, no-store, max-age=0`. The variant was 12,940 bytes versus 111,582 bytes
  for the original.
- Unsigned `/api/inngest` access returned HTTP 401. Authenticated hosted runs
  succeeded; no endpoint protection was disabled.

## Signed-in follow-up — 17–18 October

On 17 October, the existing authenticated session successfully opened My lists,
list/wish content with rendered images, the profile/avatar editor, and the plan
page on the Vercel address. Renewal was stopped while already-paid Premium
remained available through its displayed end date.

On 18 October, the browser was using the newly connected `https://wishlist.fi`
domain. Both that domain and the former Vercel address resolve to the same ready
deployment and commit recorded above. The former address redirects to the custom
domain while preserving the sampled localized paths. The user signed in on the
new domain; no credentials were handled by the review.

- Signed-in My lists loaded with the existing content and consistent available/
  reserved counts. The list-preview image and header avatar rendered in the dark
  theme.
- English and Finnish My lists and plan routes loaded with matching localized
  navigation and language labels, preserving the authenticated session.
- Both plan pages clearly labelled sandbox billing, stopped renewal, and
  retained Premium through the displayed paid-access end date.
- The English plan page's automatic billing refresh completed with
  “Billing details are up to date”; the Finnish page showed the equivalent
  confirmation.
- Public EN/FI home/Browse pages and the email logo worked on the custom domain;
  signed-out plan requests reached the matching sign-in language.
- A fresh Vercel check confirmed the correct root and absence of local-only
  environment flags. A fresh Inngest check confirmed all five functions and
  successful 18 October runs, including the daily auth maintenance function.

The native language menu opened, but its selection could not be conclusively
driven by the computer-use tool. Bilingual route/navigation checks used explicit
localized URLs. Full switcher preference and native-browser interaction coverage
remains part of Step 4; this is an automation limitation, not a diagnosed app bug.

Step 1 is complete. Delivered email links/sender verification on the new domain
remain Step 2; Paddle payment-link/webhook/return URL acceptance remains Step 3.
No fresh account, subscription, or email delivery was triggered. Visiting the
plan page performed its normal automatic billing reconciliation. Full browser
regression testing remains Step 4.
