# Live billing rollout — Step 7

Started 30 October 2026 from `2ef0dea`; updated 31 October 2026.
Step 6 is closed on the owner's confirmation. Step 7 is **in progress**.
The approved policy-only release was published on 31 October; see
[publication evidence](policy-publication-2026-10-31.md). No billing migration, live
billing deployment, real payment or refund has been performed.
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
`https://wishlist.fi/api/paddle/live/webhook`. It is **inactive**, uses platform
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
rollout candidate; it does not replace `.env.local` or change hosted variables.
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
- Recovery selects the original account/event environment and matching credentials.
  Account deletion records cancellation intents for every environment. Inactive
  environment recovery does not queue new active-environment Premium guide emails.
- The legacy webhook URL is explicitly sandbox; the new URL is explicitly live.
  Signatures, event-ID rules and persisted events use the receiver's environment.
  Saved sandbox simulator events remain recoverable after the UI switches live.
- Paddle.js selects sandbox only for sandbox, uses a matching token, and receives
  the verified Paddle customer ID through `pwCustomer`. Remounts use `Paddle.Update`.
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

| URL                          | Current production finding                                         | Required work                                                 |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `/en`, `/fi`                 | 200; clear product description and homepage support email          | Recheck during release smoke test                             |
| `/en/premium`, `/fi/premium` | 200; EUR 2/15 matches live; current copy discusses sandbox testing | Review final paid availability notices at cutover             |
| `/en/terms`, `/fi/terms`     | 200; approved Terms of use published                               | Published copy; keep aligned with actual billing availability |
| `/en/privacy`, `/fi/privacy` | 200; approved privacy notice published                             | Published notice; continue provider and retention review      |
| `/en/refunds`, `/fi/refunds` | 200 after the approved policy-only publication                     | Published EN/FI page with footer/site-map links               |
| `www.wishlist.fi`            | Resolves and redirects to `https://wishlist.fi/en`                 | Approve additional checkout hosts only if actually used       |

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
registration is **verified**. Account setup is completed. Overall onboarding is
`action_required`, with `automated_review` requiring action. The live dashboard's
**Get started → Verify your account** task specifically requests **Verify your
identity / Complete identity checks**. This is an account-holder action through
Paddle's verification flow; no identity documents or session links are recorded here.

The owner subsequently supplied a Sumsub success screen showing the profile verified.
A follow-up live MCP check still reports `action_required` at `automated_review`;
the refreshed Paddle dashboard still displays the identity-check prompt and no new
request. Record Sumsub completion separately from Paddle onboarding approval. Do
not repeat the identity flow solely because that prompt remains visible. Await
Paddle status clarification and use Paddle support if it remains unresolved.

After confirming domain approval and the existing null setting, the authorized
live default payment link was set and read back successfully as
`https://wishlist.fi/en/account/checkout`. This configuration change does not enable
live payments in the app. The live webhook remains inactive and the production
app remains on its policy-only sandbox release. No billing migration or financial
test was performed.

These are observed gaps and fixes, informed by Paddle's current guidance; this audit
does not certify legal completeness or make a provider approval decision.

## Local verification

- `npm run check`: ESLint, Stylelint, Prettier, types and 217 unit cases passed.
- `npm run test:integration`: 302 total cases with integration enabled passed,
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

## Preparation can continue during Paddle review

Paddle's outstanding approval holds live activation under the owner's launch
instruction. It does not prevent local release preparation. The agreed hold on
the production billing migration/live cutover is a release-order decision, not a
technical restriction imposed by Paddle on database work.

Work that can proceed now:

- Final review of the uncommitted billing diff and preparation of local commits.
  Keep these local until the coordinated release: pushing the entire branch can
  trigger deployment before the production schema is ready. Permanent/shared
  Preview infrastructure remains deferred.
- Record candidate source/migration hashes and confirm the configuration mapping,
  tester account, maintenance window and payment/refund acceptance checklist.
  Choosing a test method does not authorize taking a payment.
- Check backup tooling, target identifiers, restore procedure and off-device/key
  custody. Take a fresh verified backup near the actual migration, rather than
  treating an older preparation snapshot as the cutover backup.
- Run affected checks when code changes. Previously passed unchanged suites do
  not need repeated runs merely because provider approval is pending.

Continue holding the live billing deployment/environment switch, coordinated
production billing migration, live webhook activation and charged acceptance/public
sales until the applicable approval and release gates are satisfied. The published
policy-only sandbox release stays in place during preparation.

## Remaining release order

1. **Policy preparation — published:** the owner-approved EN/FI pages are live in
   the isolated policy-only release, with sandbox billing preserved. See the
   publication report. Do not switch hosted variables to the private live candidate.
2. **Provider approval — identity action required:** domain approval, Apple Pay
   registration and account setup are complete. The live default payment link is
   configured. The owner has completed the Sumsub flow, but Paddle onboarding is
   still `action_required` after rechecking the API and refreshing the dashboard.
   Confirm Paddle approval or resolve its outstanding status before live cutover;
   do not infer final approval from the Sumsub success screen alone.
3. **Review the cutover:** agree a maintenance window, tester restriction and the
   controlled real transaction/refund method. A zero-total test does not prove a
   charged payment/refund lifecycle. No real financial operation is authorized yet.
4. **Back up, migrate and deploy together:** build/review the candidate first, make
   a fresh verified backup and prevent old billing/deployment/job traffic during
   cutover. Confirm the intended production database host/name before any migration.
   Apply `20261030000100_billing_environments` and activate the compatible build in
   that coordinated window. No production execution has happened in this step.
5. **Wire and verify:** use matching primary live settings plus legacy sandbox
   recovery settings, with checkout paused. Enable the prepared notification
   destination only once its route is deployed; verify the source fence, signature,
   durable receipt, job processing and retry recovery. Complete the agreed tester
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

Sources checked 30–31 October 2026:
[Paddle go-live checklist](https://developer.paddle.com/build/go-live-checklist/),
[domain verification](https://www.paddle.com/help/start/account-verification/what-is-domain-verification),
[Paddle MCP](https://developer.paddle.com/sdks/ai/paddle-mcp/),
[IP addresses](https://developer.paddle.com/api-reference/ip-addresses/),
[Buyer Terms](https://www.paddle.com/legal/buyer-terms),
[Refund Policy](https://www.paddle.com/legal/refund-policy).
