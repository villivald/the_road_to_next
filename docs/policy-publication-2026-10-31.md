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

Account setup is complete, but onboarding reports `action_required` at the
`automated_review` step. The live dashboard asks the owner to **Verify your identity**
using **Complete identity checks** under **Get started → Verify your account**.
No identity documents or verification-session links are stored in this record.
The owner supplied a Sumsub success screen after completing that flow. Paddle
still reports `action_required` at `automated_review` on a subsequent live MCP
check, and its refreshed dashboard still shows the identity prompt. Sumsub
completion is recorded separately from final Paddle approval; live cutover stays held.

The live billing candidate and reviewed migration remain held pending the
coordinated cutover and agreed controlled payment/refund acceptance. Do not deploy
the entire uncommitted working tree as a policy update. The final handover handbook
remains deferred.
