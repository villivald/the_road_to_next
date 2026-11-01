# Live billing rollout — Step 7

Started 30 October 2026 from `2ef0dea`; updated 1 November 2026.
Step 6 is closed on the owner's confirmation. Step 7 is **in progress**.
The approved policy-only release was published on 31 October; see
[publication evidence](policy-publication-2026-10-31.md). The production billing
migration and paused live-mode deployment were completed on 1 November; see the
[executed release](billing-live-deployment-2026-11-01.md). The owner subsequently
activated the webhook and approved [owner-only checkout](billing-live-owner-checkout-2026-11-01.md).
No payment or refund has been performed by the release tooling.
Ownership is recorded by role; personal names and credentials stay out of these documents.

## Verified provider work

The live Paddle MCP is authenticated. The owner granted `client_token.write`,
`notification_setting.write` and `checkout_settings.write`. Setup through MCP is
separate from the API key that the deployed application needs.

The source sandbox product, both price editors and completed sandbox checklist
were inspected. The source has no active discounts. The initially empty live
catalogue now contains these equivalents:

| Item             | Sandbox ID                       | Live ID                          |
| ---------------- | -------------------------------- | -------------------------------- |
| Wishlist Premium | `pro_01m46qd3xs27kztr1vbhjn1yw2` | `pro_01m6796xqpq7227k1d0fvzp6ck` |
| Monthly          | `pri_01m46qez5sp578954z0stc75s5` | `pri_01m679eamdw148b933tth2g130` |
| Annual           | `pri_01m46qfpen2v59bhb4bqh56fjj` | `pri_01m679g6j7dky7w5p50cqz9b96` |

Both environments use EUR 2/month and EUR 15/year, tax included (`internal`),
quantity exactly one, no trial and standard digital-goods tax classification.
Live API reads and both public language versions confirm the intended pricing.
No discount mapping was needed. Sandbox catalogue/settings were preserved.

The live client token is named **Wishlist live checkout**. The new notification
setting is `ntfset_01m67c29qfzqy7vsnq2ks4awy5`, pointing to
`https://wishlist.fi/api/paddle/live/webhook`. It was created inactive and was activated by the owner on 1 November, confirmed
through the live MCP. It uses platform
traffic and subscribes to 21 transaction/subscription/adjustment event types.
Sensitive fields are not requested. The existing sandbox destination remains at
`https://wishlist.fi/api/paddle/webhook`.

The owner-created live runtime key passed read-only authentication, required-scope
and catalogue checks. Its required permissions are `customer.write`, `price.read`,
`transaction.write`, `subscription.write`, `adjustment.read` and
`customer_portal_session.write`; setup permissions are unnecessary for runtime.

The consolidated settings are in ignored `.env.paddle-live.local`, mode 600.
They include primary live settings and the original `PADDLE_SANDBOX_*` recovery
settings. `PADDLE_CHECKOUT_ENABLED=0` keeps new sales paused. This file is a private
rollout configuration; it does not replace `.env.local`. The selected billing
settings were deliberately applied to Production during the 1 November release.
Do not print it, paste it into chat, commit it or use it as a policy-only release's
complete environment. Temporary duplicate credential captures were removed.

## Application changes

- Explicit `sandbox`/`live` configuration validates key/token prefixes, distinct
  price IDs, API origins and portal hosts. Unspecified or mismatched configuration
  does not enable paid checkout. New live checkout requires an explicit `1` flag;
  pausing sales preserves management, reconciliation, refunds and cancellation.
  A nonempty comma-separated `PADDLE_CHECKOUT_TESTER_IDS` limits starting/resuming
  checkout to those authenticated app user IDs. Unset/empty means no tester restriction.
- Billing accounts/events carry an environment. Existing records migrate to
  sandbox. A user can have one account in each environment. Subscriptions,
  payments and checkouts inherit the parent account's environment.
- Paid Premium access follows the active environment; promo/manual access is
  preserved. Historical sandbox payments are not converted into live access.
  Existing future promo dates are preserved, not silently rescheduled.
  Public discovery/favorite-person badges use that same environment boundary,
  and queued Premium guides are canceled if their payment belongs to another
  environment. Current-environment and promo/manual guides remain eligible.
- Recovery selects the original account/event environment and matching credentials.
  Account deletion records cancellation intents for every environment. Inactive
  environment recovery does not queue new active-environment Premium guide emails.
- The legacy webhook URL is explicitly sandbox; the new URL is explicitly live.
  Signatures, event-ID rules and persisted events use the receiver's environment.
  Saved sandbox simulator events remain recoverable after the UI switches live.
- Paddle.js selects sandbox only for sandbox, uses a matching token, and receives
  the verified Paddle customer ID through `pwCustomer`. Remounts use `Paddle.Update`.
  Paused/restricted checkout also hides the resume link and its invitation to
  continue paying, while retaining discard and status-refresh controls.
- Provider resource/event IDs remain globally unique. A cross-environment collision
  fails closed instead of overwriting another environment's history.

## Dynamic webhook source checks

Each environment fetches its current public `/ips` endpoint. IPv4 CIDRs are
validated and cached for five minutes per process, with duplicate refreshes shared.
Expired refresh failures return 503; signatures are still mandatory. No IP list
is hard-coded in the application.

Hosted requests trust only Vercel's edge-supplied `x-vercel-forwarded-for` header.
Arbitrary forwarding headers are not accepted. Outside Vercel, live delivery is
rejected; local sandbox fixtures require the configured loopback origin. A future
hosting change needs an explicit trusted-proxy implementation. Actual hosted
acceptance of this fence remains a release check.

## Website audit and policy preparation

Public HTTP findings updated after the verified policy-only publication:

| URL                          | Current production finding                                            | Required work                                                 |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/en`, `/fi`                 | 200; clear product description and homepage support email             | Recheck during release smoke test                             |
| `/en/premium`, `/fi/premium` | 200; EUR 2/15 matches live; checkout-paused notice, no sandbox notice | Complete tester acceptance before opening sales               |
| `/en/terms`, `/fi/terms`     | 200; approved Terms of use published                                  | Published copy; keep aligned with actual billing availability |
| `/en/privacy`, `/fi/privacy` | 200; approved privacy notice published                                | Published notice; continue provider and retention review      |
| `/en/refunds`, `/fi/refunds` | 200 after the approved policy-only publication                        | Published EN/FI page with footer/site-map links               |
| `www.wishlist.fi`            | Resolves and redirects to `https://wishlist.fi/en`                    | Approve additional checkout hosts only if actually used       |

The owner selected Paddle's standard Buyer Terms and Refund Policy, including
mandatory consumer rights, without an additional Wishlist money-back guarantee.
The published refunds page explains renewal cancellation, refund/withdrawal requests,
paid-access effects and support. It was published in the approved policy-only release on 31 October. It links to Paddle's
current Buyer Terms, Refund Policy and payment support.

The published EN/FI terms/privacy pages incorporate actual storage/sharing
behavior, provider links, applicable rights and the selected 30-day manual-backup
and 90-day resolved-support retention. The real operator name is kept in ignored
configuration and rendered through `OPERATOR_LEGAL_NAME`; it is absent from
repository documentation. Configure this value separately for the policy-only
release without switching Paddle variables. See [the policy draft](public-policy-draft.md).
The owner approved publication; this is not certification of legal compliance or
provider approval. Provider contracts/transfer safeguards remain an operator review
responsibility.
In particular, do not advertise unimplemented purge intervals or unresolved backup,
provider-log or support-mail retention. Carry the approved operator identity into
the website through the agreed publication approach, without adding personal names
to repository documentation. The draft is not evidence of published compliance.

On 31 October, the live MCP confirmed `wishlist.fi` is **approved** and Apple Pay
registration is **verified**. Account setup was completed. At the initial check,
overall onboarding was `action_required`, with `automated_review` requiring
action. The live dashboard's **Get started → Verify your account** task requested **Verify your
identity / Complete identity checks**. This is an account-holder action through
Paddle's verification flow; no identity documents or session links are recorded here.

The owner subsequently supplied a Sumsub success screen showing the profile verified.
The first follow-up live MCP check still reported `action_required` at
`automated_review`; the refreshed dashboard retained the identity-check prompt.
This historical mismatch was resolved later on 31 October: the live MCP now
reports overall onboarding **`completed`**, with both `account_setup` and
`automated_review` completed. The verification-support email is no longer needed.
No identity flow needs repeating. Domain/Apple Pay approval and the default link
were reconfirmed in the same read-only audit.

After confirming domain approval and the existing null setting, the authorized
live default payment link was set and read back successfully as
`https://wishlist.fi/en/account/checkout`. This configuration change does not enable
live payments in the app. The live webhook is now active. Production was
subsequently migrated and deployed in live mode with checkout paused on 1 November.
No financial test was performed.

These are observed gaps and fixes, informed by Paddle's current guidance; this audit
does not certify legal completeness or make a provider approval decision.

## Local verification

- `npm run check`: ESLint, Stylelint, Prettier, types and 217 unit cases passed.
- `npm run test:integration`: 302 integration cases passed before final review,
  including environment isolation, legacy recovery, deletion, pause behavior,
  collisions, live HTTP source/signature checks and refunds.
- The affected sandbox billing/localization browser run passed 38 cases.
  Eight live-mode/policy browser cases passed. Fixtures verify matching tokens, trusted customer IDs, no
  sandbox selection, SDK remounts, EN/FI, light/dark, mobile and desktop, accessibility
  and 320px with doubled text. They use fake provider data and make no real payment.
- A disposable PostgreSQL 18 drill applied the previous migrations, inserted
  fictional existing billing data, then applied the new migration. Accounts/events
  became sandbox; payment/grant relationships and access dates survived; a second
  environment account for the same user/customer ID was allowed. The container and
  temporary fixture files were removed.

Private evidence is under `.local/billing-live/2026-10-30/`. Local fixtures do not
prove real SDK/domain approval, hosted webhook delivery or a charged lifecycle.

The prepared policy-only patch is under the private evidence directory. It contains
policy pages, their translations/navigation, the operator-variable example and the
manual-retention documentation; it excludes billing code and Prisma changes. It
applies to committed baseline `2ef0dea` and type-checks with its original Prisma
schema. It is intended for review, not an instruction to deploy the entire working tree.

## Preparation before the coordinated release

Preparation is complete and reviewed commit `123d396` is deployed. The owner
confirmed the existing backup ready/checked and explicitly requested proceeding
without maintenance or a fresh capture for this release. That instruction
supersedes the normal release checklist's maintenance/fresh-backup sequence for
this execution; no skipped action is reported as performed.

Production now uses live settings with owner-only checkout enabled, the tester
restriction and legacy sandbox recovery. The migration matches the successful
local drill. Both candidate and public hosted checks passed, and Inngest registered
the six current handlers through the canonical production route. See the executed
release above. Permanent Preview infrastructure remains deferred. Genuine unpaid draft delivery and processing passed on 1 November; the owner’s EUR 2 payment, matching Premium grant and all 13 live events also passed. Renewal cancellation also passed. The EUR 2 refund is now approved, with its payment marked refunded and grant revoked; all 16 related events are processed. Local UI/re-subscription follow-up and opening sales remain pending;
enabling a tester does not authorize a payment.

## Remaining release order

1. **Policy preparation — published:** the owner-approved EN/FI pages are live in
   the isolated policy-only release, with sandbox billing preserved. See the
   publication report. These policies were preserved in the paused live deployment.
2. **Provider approval — completed:** the live MCP confirms overall onboarding,
   account setup and automated review are all `completed`. Domain approval, Apple
   Pay registration, the catalogue and live default payment link were reconfirmed.
   The compatible route is deployed and its live destination is active.
3. **Cutover decision — executed:** the owner selected direct release without
   maintenance/fresh capture, after confirming the existing backup checked. The
   existing verified owner account is allowlisted. The owner completed the EUR 2 monthly payment, verified against provider and
   local records. The owner also canceled renewal, verified with the matching end date and
   continued paid access. The owner requested the EUR 2 refund; its pending-approval event and continued
   access were verified. The subsequent approved refund and grant revocation passed; no refund
   mutation has been authorized for the release tooling.
4. **Migration and paused deployment — complete:** migration
   `20261030000100_billing_environments` is applied and reviewed commit `123d396`
   is live as `dpl_AwQyVR889D9ng62oPnUtwSZbqVqR`. All 17 migration checksums and
   preserved row counts were verified. Checkout was subsequently enabled only for the owner tester.
5. **Wire and verify:** use matching primary live settings plus legacy sandbox
   recovery settings; these are configured. Checkout is enabled only for the owner tester. Inngest's six
   handlers are registered and the destination is active. Genuine unpaid draft
   delivery passed with HTTP 200, one durable live event processed and no
   payment-backed grant. The subsequent EUR 2 payment, active subscription and
   single payment-backed grant were verified, with all 13 live events processed.
   The owner subsequently canceled renewal; the scheduled 1 December end date,
   null next billing date, processed update and continued grant were verified.
   The pending refund preserved access; its subsequent approval revoked the paid
   grant and all 16 related events were processed. The live lifecycle acceptance
   passed. A local UI/re-subscription follow-up remains to review and deploy;
   deliberate live retry recovery has not been exercised. Complete the agreed tester
   checkout/access/portal/cancellation/refund checks with `PADDLE_CHECKOUT_ENABLED=1`
   and a nonempty tester allowlist. Other users remain unable to start/resume checkout.
6. **Open sales:** only after approval and acceptance, deploy the intentional
   `PADDLE_CHECKOUT_ENABLED=1` configuration and remove the tester restriction for
   the agreed audience. Monitor billing
   failures, job backlog and entitlements and record actual deployment evidence.

### Rollback constraint

This migration removes the old single-column account uniqueness constraints.
Old code's `upsert` by user ID is not compatible with the new schema; do not assume
rolling back to `2ef0dea` is safe. Pause checkout with the new flag and use a
schema-compatible build/forward fix. Do not restore a pre-cutover database over
later paid activity without a separate recovery/reconciliation decision.

The final handover handbook remains deferred until requested.

## Final review and preparation — 31 October

The owner committed the implementation as `4ef8a24` without pushing. Follow-up
review covered configuration/credential routing, authenticated checkout/portal
ownership, webhook source/signature/durable receipt, cross-environment recovery,
account deletion, entitlement reads, Paddle.js initialization and migration
compatibility. It found two missed environment filters: public Premium badge
counts and eligibility of already queued Premium guides. New integration cases
reproduced both before the fixes. A shared environment filter now covers access,
badges and queued guides, preserving manual/promo grants. The review also corrected
the resume-checkout UI for paused/restricted users.

The follow-up changes were committed as `123d396` and deployed on 1 November.
No dependency or additional migration change was needed. The full check passed
with 217 unit cases; the isolated integration suite
passed 307 cases. The live-mode browser suite passed 12 cases, including EN/FI
non-tester attempts to resume a pending checkout. The affected sandbox billing
and localization browser suite passed all 38 cases. Both browser runs built the
production app against isolated fixtures; they took no real payment.

At that review checkpoint the live MCP still reported onboarding
`action_required` at `automated_review`. A later 31 October re-evaluation confirms
onboarding and both steps are now **`completed`**; domain approval/default link
are intact and the live notification remains inactive. A Vercel inspection
confirmed the same READY policy-only production deployment before release. Those
review checkpoints made no production changes; the separate 1 November release
record supersedes their deployment status.

The owner chose the existing verified Wishlist account as the sole live tester,
and on 31 October reported backup/key custody not yet complete. On 1 November the
owner confirmed the existing backup ready and checked. The accepted
30 October archive is present, its SHA-256 still matches the offline restore
report, and its separate key file has mode 600. No fresh hosted backup or source
database query was performed during this review.

The concrete [release checklist](billing-live-release-checklist.md) records the
configuration matrix, owner backup action, maintenance/deployment sequence,
proposed EUR 2 monthly test/cancellation/refund and evidence needed before public
sales. A static bilingual maintenance artifact was prepared locally, with no
runtime functions or secrets. Light/dark accessibility and 320px/doubled-text
layout checks passed; its hosted routing/deployment acceptance remains a release
check. That maintenance artifact was not uploaded or deployed. The application
release used the owner's direct-release instruction instead. The follow-up commit,
private tester selection, production migration and paused live deployment are now
complete. The code matched the successful test checkpoint, so unchanged local
suites were not repeated; cloud build, migration and hosted checks ran against
the actual release. The subsequent owner-only unpaid checkout verified genuine
live-event delivery and processing. The subsequent owner payment also passed,
including its subscription, grant and single guide. Renewal cancellation also
passed without prematurely revoking paid access. The owner refund request preserved access while pending; its subsequent approval
and grant revocation also passed. The local UI/re-subscription follow-up and
opening sales remain pending.

Sources checked 30–31 October 2026:
[Paddle go-live checklist](https://developer.paddle.com/build/go-live-checklist/),
[domain verification](https://www.paddle.com/help/start/account-verification/what-is-domain-verification),
[Paddle MCP](https://developer.paddle.com/sdks/ai/paddle-mcp/),
[IP addresses](https://developer.paddle.com/api-reference/ip-addresses/),
[Buyer Terms](https://www.paddle.com/legal/buyer-terms),
[Refund Policy](https://www.paddle.com/legal/refund-policy).
