# Policy-only publication — 31 October 2026

The owner approved publication of the reviewed EN/FI policies, including the public
operator identity and selected retention rules. The policies are now publicly
accessible on `wishlist.fi`. This record uses roles and contains no personal names
or credentials.

## Deployed scope and provenance

- Project: `wishlist.fi`, verified against its linked Vercel project before deployment.
- Original production/source baseline: `2ef0dea526ff36398033d38169307c3a140e51e4`.
- Previous deployment: `dpl_5LMaYHrENqA5h1NW2mUAarCDGwQ1`.
- Published deployment: `dpl_crr3BoXzzfDd1ivc6dvdxkmZgatv`, READY.
- Approved patch SHA-256: `891c2c52d2810b0a81d815ba7efb3439a9ca6961353980d6b113c57a98d4c80d`.

This was a manual CLI publication from an isolated export of the verified
production commit plus the policy-only patch. It is not a new Git commit. The
working tree remains uncommitted. The source schema matches the original baseline;
the new billing-environment migration, live route, clients and entitlement changes
were excluded. No database migration, real purchase or refund was performed.

The patch includes information pages, translations, footer/site-map navigation,
the operator-variable example and manual-retention documentation. Only
`OPERATOR_LEGAL_NAME` was added to the production project environment. Its value
is kept in private configuration and intentionally rendered on the website.
The deployment explicitly uses `PADDLE_ENVIRONMENT=sandbox` for build and runtime;
existing Paddle credentials/prices were preserved.

## Published pages

All six returned HTTP 200 directly, without authentication or generic redirects:

| Policy               | English                                                     | Finnish                                                            |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Terms                | [Terms of use](https://wishlist.fi/en/terms)                | [Käyttöehdot](https://wishlist.fi/fi/terms)                        |
| Privacy              | [Privacy](https://wishlist.fi/en/privacy)                   | [Tietosuoja](https://wishlist.fi/fi/privacy)                       |
| Refunds/cancellation | [Refunds and cancellations](https://wishlist.fi/en/refunds) | [Maksunpalautukset ja peruutukset](https://wishlist.fi/fi/refunds) |

The refund page follows the owner-selected Paddle standard terms/policy, with no
additional Wishlist money-back guarantee. The privacy page includes the selected
30-day encrypted manual-backup maximum and 90-day resolved-support retention,
including the legal-retention exception. The runbook records manual expiry duties;
no automatic backup/mailbox deletion was introduced or claimed.

## Verification and limits

The patch applied/type-checked against the baseline's original Prisma schema.
Vercel's production build passed. Before promotion, 11 protected candidate URL
checks passed. The custom domain was rechecked against the previous deployment
immediately before promotion to avoid replacing a concurrent release.

After promotion, 12 anonymous public URL checks passed, plus the canonical www
redirect. Operator identity and retention text are visible on the intended pages;
localized homepage footer/refund links and support contact are present. The
Premium page still displays the sandbox/no-real-money notice. The original
sandbox webhook path remains present (GET 405); the held live webhook path remains
absent (GET 404). No signed test event was sent into production.

Earlier local checks covered both languages, themes, mobile/desktop, 320px with
doubled text, accessibility and rendered-policy visual review. Public HTTP checks
confirm publication, not legal certification or Paddle approval.

Private deployment/provenance/verification evidence is under
`.local/policy-publication/2026-10-31/`; the isolated source and exact patch are
retained there. No credentials or identity documents belong in this record.

## Next step

The owner submitted `wishlist.fi`, and the live MCP now confirms it is approved,
with Apple Pay registration verified. The authorized live default payment link is
configured and verified as `https://wishlist.fi/en/account/checkout`.

The initial post-Sumsub check reported `action_required` at `automated_review`,
while the dashboard retained its identity-check prompt. A later live MCP recheck
on 31 October confirms **onboarding `completed`**, including `account_setup` and
`automated_review`. The verification mismatch is resolved. No identity documents
or verification-session links are stored in this record.

On 1 November, reviewed commit `123d396` and its billing migration were deployed
in live mode with checkout paused, following the owner's explicit direct-release
instruction. The policies in this publication record were preserved. See the
[executed deployment](billing-live-deployment-2026-11-01.md) and
[current release checklist](billing-live-release-checklist.md).
The owner subsequently activated the live notification and approved
[owner-only checkout](billing-live-owner-checkout-2026-11-01.md). Genuine event
processing passed for the unpaid draft and subsequent owner EUR 2 payment. Renewal cancellation also passed. The EUR 2 refund is approved and the paid grant revoked; all 16 related events are processed. A local UI/re-subscription follow-up and opening sales remain pending. The final handover handbook remains deferred.
