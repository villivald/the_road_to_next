# Paused live-billing deployment — 1 November 2026

Step 4 was completed against production on the owner's instruction. The owner
explicitly chose a direct migration/deployment without a maintenance page or a
fresh backup, after confirming the existing backup was ready and checked.
No new backup or maintenance deployment is claimed in this record.

This is the initial paused-release checkpoint. The later
[owner-only checkout deployment](billing-live-owner-checkout-2026-11-01.md)
supersedes its checkout/webhook status without changing the application code.

## Deployed source and target

- Reviewed source: `123d3967cae14eb162d6e94445126da535b934ba`.
- Vercel project: `wishlist.fi`, `prj_4Yz4MJOc3c5UnZUKjjgyZQRlpHs5`.
- New deployment: `dpl_AwQyVR889D9ng62oPnUtwSZbqVqR`, READY.
- Deployment URL: `https://wishlist-hnq7udiy3-villivalds-projects.vercel.app`.
- Public domain: `https://wishlist.fi`, inspected after promotion and verified.
- Previous deployment: `dpl_crr3BoXzzfDd1ivc6dvdxkmZgatv`.

An isolated Git archive of the reviewed commit was uploaded through the CLI;
private local files and credentials were excluded. The cloud build passed
`npm ci`, Prisma client generation and the Next.js production build before the
database migration. It was staged with `--prod --skip-domain`, checked on its
protected deployment URL after migration, then promoted. No Git push was made.

## Production migration

The existing direct Neon production database/schema was independently matched to
the stored confirmed target. TLS certificate/hostname validation succeeded.
Read-only preflight verified all 16 existing migration checksums and exactly one
pending migration: `20261030000100_billing_environments`.

Prisma `migrate deploy` applied that migration successfully. Read-only verification
confirmed all 17 migration checksums, the new compound uniqueness/due-work indexes,
and unchanged counts for users, lists, wishes, media, billing accounts, events,
checkouts, subscriptions, payments and Premium grants. All three pre-existing
billing accounts and 113 events are labelled `sandbox`; existing financial history
was preserved. No reset, seed, hosted restore or manual entitlement grant ran.

Migration SHA-256:
`9e67fecff303645b406623edbf2a3b4ccacce640087d400a96ebaa04c327db3f`.

## Effective billing configuration

- Primary environment is `live`, with the matching live API key, client token,
  webhook secret and EUR 2/month / EUR 15/year price IDs.
- `PADDLE_CHECKOUT_ENABLED=0` in Production and explicitly in the deployment's
  build/runtime configuration. New sales remain paused.
- `PADDLE_CHECKOUT_TESTER_IDS` contains the owner-selected existing verified
  account's app user ID. The exact ID is retained privately.
- All five `PADDLE_SANDBOX_*` settings preserve legacy sandbox recovery.
- The 13 billing settings are sensitive and Production-only. Unrelated
  environment-variable metadata and the published operator setting were preserved.
- The owner-only restriction does not itself enable checkout.

Runtime-key authentication, required permissions and both live prices were checked
read-only. The live notification destination
`ntfset_01m67c29qfzqy7vsnq2ks4awy5` still points to
`https://wishlist.fi/api/paddle/live/webhook` and remains **inactive**, confirmed
through the live Paddle MCP after deployment.

## Hosted verification

Twenty protected candidate checks and twenty public checks passed:

- EN/FI home, Premium, sign-in, Terms, Privacy and Refunds pages return 200.
- The approved operator identity, retention wording and Paddle refund link remain
  present. No personal name or credential is included in this document.
- Premium pages show subscription unavailability and omit the sandbox notice.
- EN/FI database-backed people browsing renders successfully with the migrated
  runtime schema.
- Both webhook routes exist (GET 405) and reject an ordinary unsigned/non-Paddle
  caller (POST 403). No signed Paddle event was sent.
- Inngest rejects an unsigned GET with 401. A signed read-only GET returns 200,
  authenticates successfully, reports Cloud mode and all six handlers, with SDK
  version 4.21.0.

The initial verification probe expected unsigned Inngest introspection to return 200. Inspection of the installed SDK established that Cloud mode requires signed
introspection. The probe was corrected and passed with the existing private
production signing key; application authentication was not relaxed.

The existing Inngest app `wishlist` was then synced through the canonical
`https://wishlist.fi/api/inngest` route. The provider returned 200,
`Successfully registered`, `modified: true`. No function was manually invoked.
Signed introspection and successful registration do not establish a completed
scheduled job or end-to-end Paddle event processing.

Private source/provenance, environment-change metadata, migration and hosted
verification evidence are under `.local/billing-live/2026-11-01/`. They are ignored
by Git. Signing keys, temporary request signatures, account/customer IDs and raw
customer data do not belong in repository documentation.

## Remaining Step 7 work

The app is deployed in live mode with checkout paused. Step 7 is still in progress:

1. Activate the existing live notification destination and verify genuine Paddle
   delivery, durable receipt and reconciliation.
2. Enable checkout only for the configured tester when controlled acceptance is
   authorized; verify an unpaid draft grants no access.
3. Obtain separate approval for the proposed EUR 2 payment, renewal cancellation
   and full refund checks. No real transaction or refund has been performed.
4. Open public sales only after acceptance and an explicit launch decision.

Do not roll back to the old policy-only build after this migration. Its billing
upsert assumes the removed uniqueness constraints. Keep checkout paused and use a
schema-compatible build or forward fix for recovery.
