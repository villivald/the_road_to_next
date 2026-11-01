# Refund clarity and re-subscription — 1 November 2026

**Post-push checkpoint:** the owner committed and pushed these changes as
`21cd304137260c2c2d858baf89fee2c10871d183`. They are now READY on `wishlist.fi` in
deployment `dpl_BDbjqtApUr83pbNTzZbXhqcEm7Yz`. Read-only review at 13:13–13:14 UTC
passed 20 public EN/FI checks, verified the six authenticated Inngest handlers and
reconfirmed the approved refund, revoked grant and all 16 processed events. The
signed-in English plan page visibly shows the corrected copy, neutral refund,
buyer-support links and consent-gated restart control. Checkout remains owner-only.
The bounded deployment error-log review contained only the expected unsigned
Inngest probe rejection. The owner still needs to submit the explicit restart
action and stop at plan choices; no new purchase is required. No financial action
was performed during this review. The preparation/deployment boundary below is
historical; the restart action is the remaining hosted acceptance check.

The owner reported **Full refund issued** and a contradictory plan page: current
access correctly said Free, but the subscription card still promised remaining
paid access and styled the completed refund as an error. The owner requested
clear buyer refund links and approved immediate re-subscription after a full
refund and cancellation of renewal.

## Production evidence

Read-only provider and production database checks confirmed the original EUR 2
refund is approved, the payment is marked refunded and its Premium grant revoked.
All 16 related events were delivered and processed. The original subscription
still has its scheduled 1 December cancellation and no next billing date. This
contractual end date is separate from the access removed by the approved refund.
See [the live acceptance record](billing-live-owner-checkout-2026-11-01.md).

## Changes

- Cancellation copy promises remaining paid access only when non-refunded paid
  time remains. Otherwise it states that this subscription provides no remaining
  paid access. In that case the future date is labeled **Cancellation takes effect
  on**, to distinguish it from an access expiry date.
- Approved refunds use a neutral confirmation. A reminder to stop renewal appears
  only while renewal has not already been canceled. Other paid periods and promo
  access continue to be calculated independently.
- **Request a refund / Pyydä maksunpalautusta** links appear beside subscription
  management, in Billing help and on the public refund policy page. They lead to
  `https://paddle.net/`, which Paddle identifies as its buyer support route.
- Billing help explains that Paddle reviews refund requests and that a refund
  request and cancellation of renewal are separate actions. The existing
  `support@wishlist.fi` fallback remains available. No automatic refund endpoint
  or extra API permission was added.

## Subscribe again

After a full refund and canceled renewal, the plan page offers **Start a new
subscription / Aloita uusi tilaus**. The user must first confirm that the old,
refunded subscription should end immediately. The action ends that contract and
then shows the normal monthly and annual plan choices. It does not create a new
transaction or charge a payment. Choosing and paying for the new plan remain
separate checkout actions with explicit recurring-payment consent.

The server validates the verified session, ownership, active billing environment,
checkout flag and tester allowlist. It requires canceled renewal, a fully refunded
remaining period, no other remaining paid period, no other current subscription,
and no open checkout. It independently reads Paddle's current subscription and
completed transactions, including approved refund amounts, before canceling.
Pending/partial refunds or an unseen non-refunded payment cannot qualify.

The operation claims the existing billing lease atomically, rechecks the session
and revision after provider reads, and verifies the terminal provider state before
updating the local subscription. A lost response releases the lease and schedules
normal reconciliation; retrying can recover an already-canceled contract without
creating a replacement payment. Existing payment/refund history and promo grants
are preserved.

Cancellation without a refund retains the existing behavior: paid access remains
until expiry, and the account cannot accidentally start overlapping billing.

## Release boundary

These changes are local and uncommitted. They have not replaced production commit
`123d396`. No dependency, environment-variable or schema change is required; there
is **no new database migration**. The private local QA uses fixture payments only.

Each database must still have the existing billing-environment migration applied.
The browser/integration harness migrates `wishlist_test`; it does not migrate
the separate development database. A localhost failure subsequently exposed that
`wishlist_dev` was missing `20261030000100_billing_environments`. It was applied
on 1 November to the verified target `127.0.0.1:55432/wishlist_dev`, schema `public`,
and the Prisma client regenerated. All 17 migrations are now applied locally.
The existing 3 users, 3 lists, 11 wishes and 15 media rows were preserved; the
plan-page billing/access queries passed for all three local users. No reset or
production database action was performed for this correction.

After review and deployment with the owner restriction preserved, verify the new
copy and explicit restart action on the owner account. The action should reveal
plan choices without starting a payment. Opening checkout to other users remains
a separate release decision. The complete handover handbook remains deferred.

## Validation

- `npm run check`: ESLint, Stylelint, Prettier, route generation, TypeScript and
  all 217 unit tests passed.
- `npm run test:integration`: all 318 integration tests passed, including new
  refund eligibility, ownership/environment restrictions, stale provider data,
  unseen payments, promo preservation, lost-response recovery, worker leases and
  concurrent restart requests.
- Billing/localization browser suites: all 42 Chromium desktop/mobile checks
  passed. After the final atomic lease protection, a fresh production build and
  all four focused EN/FI refund/re-subscription checks also passed.
- Browser coverage includes pending-to-approved refunds, neutral refund feedback,
  canceled renewal without paid access, buyer-support links on the plan and public
  policy pages, explicit restart consent, no payment from the restart action, and
  a new annual checkout restoring Premium after its fixture payment.
- Axe, keyboard focus/navigation, reduced motion, light/dark themes, 320px width
  and doubled text passed. The English desktop and Finnish narrow dark previews
  were visually inspected. Stable private screenshots are under
  `.local/billing-live/2026-11-01/refund-ui-preview/`.

The Mac's native SWC cache needed the private writable override
`SWC_NATIVE_BINDING_CACHE="$PWD/.local/swc-native"`; no dependency or lockfile
change was made. One browser test import was adjusted to load JSON catalogs using
Node's `createRequire`, consistent with the existing live browser suite. Builds
succeeded with a broad local-media file-tracing warning in the unchanged media
storage module. Production source uploads must continue to exclude private local
evidence, as the existing reviewed-source release workflow does.

The new restart flow has not yet been exercised against the live provider or
deployed. No second live purchase, refund mutation or immediate cancellation was
performed by these checks.

References checked 1 November 2026:
[Paddle buyer refund route](https://www.paddle.com/help/manage/your-customers/buyers-refunds),
[subscription cancellation semantics](https://developer.paddle.com/api-reference/subscriptions/cancel-subscription/).

## Final restart acceptance — passed

The owner submitted the consent-gated restart action on the deployed app and
reported reaching the plan choices. Read-only verification at 13:20–13:22 UTC
confirmed:

- Paddle's old subscription is terminally `canceled`, with no next billing date
  or scheduled change. Its cancellation timestamp is 13:19:15 UTC on 1 November.
- The local subscription mirrors that terminal state. The owner remains on Free;
  the original refunded payment and revoked grant are retained unchanged.
- Four genuine new notifications (`subscription.updated`, `subscription.canceled`,
  `transaction.canceled`, `transaction.updated`) were delivered on their first
  attempts with HTTP 200 and marked processed in the live event ledger.
- No replacement provider transaction or local checkout was created after the
  preceding review. There is still one original payment and one revoked
  payment-backed grant, with one original Premium guide.
- The additional canceled transaction belongs to Paddle's earlier unpaid
  payment-method-change flow; it is not a new charge. Including that flow's two
  earlier events, all 22 account-related events are processed.

Private evidence: `restart-acceptance-provider.json`,
`restart-acceptance-verification.json` and `check-restart-acceptance.mjs` under
`.local/billing-live/2026-11-01/`. The owner performed the contract action; the
agent's checks were read-only. No second live purchase was needed.

Step 7 implementation and controlled live acceptance are complete. Step 8 now
chooses the release audience and records release/handover readiness. Checkout
remains owner-only until a separate audience/activation decision; no allowlist,
provider settings or deployment was changed by this acceptance check. Real
renewal timing and deliberate production replay/outage testing remain unexercised;
sandbox/integration coverage is retained. The complete handbook remains deferred.
