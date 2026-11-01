# Owner-only live checkout — 1 November 2026

The owner activated the existing live notification destination and explicitly
approved enabling checkout for the selected verified owner account. The owner
subsequently completed the monthly payment test. Public sales remain a separate
release decision. The owner also canceled renewal; full refund acceptance is
complete; public sales are still restricted.

## Current deployment

- Source remains reviewed commit `123d3967cae14eb162d6e94445126da535b934ba`.
- Current deployment: `dpl_Hy2FigjVj8mye4EVyEfjNSpgudaT`, READY.
- Deployment URL: `https://wishlist-8abmxh6ar-villivalds-projects.vercel.app`.
- Public domain: `https://wishlist.fi`, verified after promotion.
- Previous paused deployment: `dpl_AwQyVR889D9ng62oPnUtwSZbqVqR`.
- `PADDLE_CHECKOUT_ENABLED=1` is explicit in build/runtime and Production.
- The nonempty `PADDLE_CHECKOUT_TESTER_IDS` restriction contains exactly the
  existing verified owner account. It was reaffirmed before enabling checkout.
  The exact user ID is retained privately.
- No application code, dependency, migration or Git push was involved.

Ten protected candidate checks and ten public checks passed: EN/FI Premium pages
continue to show unavailability for signed-out visitors, sign-in pages respond,
signed-out plan requests redirect to sign-in, the live webhook route exists and
rejects an ordinary unsigned source, and signed Inngest introspection authenticates
in Cloud mode with all six handlers. The tester guard has prior integration and
browser coverage; the actual signed-in owner subsequently reached the monthly
checkout page.

Read-only preflight confirmed that the selected owner is verified and the live
runtime key can list customers, transactions and subscriptions. Each resource
returned zero rows at that preflight check. No customer, transaction, subscription,
payment or refund was created by the release tooling.

## Genuine unpaid checkout verification

The live MCP confirmed destination `ntfset_01m67c29qfzqy7vsnq2ks4awy5` is active,
at `https://wishlist.fi/api/paddle/live/webhook`, with platform traffic and the
expected 21 event types. No deliveries were recorded at preflight. Activation
alone does not establish genuine delivery or reconciliation.

The owner reached the monthly Premium checkout page without paying. Read-only
production verification at 12:03 UTC and the Paddle delivery check at 12:06 UTC
confirmed:

- The selected owner's live transaction is a monthly EUR draft, with ownership
  and its configured price verified.
- Paddle delivered the genuine `transaction.created` notification on its first
  attempt at 12:03 UTC; the hosted receiver returned HTTP 200.
- One matching live event was persisted and marked processed. The checker did
  not invoke synchronization or write to the database.
- No payment row or payment-backed Premium grant exists for the transaction.

This establishes genuine source acceptance, signature verification, durable
receipt and processing for the unpaid checkout. It does not establish the paid
subscription lifecycle, duplicate delivery recovery, cancellation or refund.

The read-only checker is retained privately at
`.local/billing-live/2026-11-01/check-live-draft.mjs`. It creates no checkout and
performs no synchronization or financial action. Deployment evidence is under
`.local/billing-live/2026-11-01/owner-checkout/`. Provider/customer IDs and raw
payloads stay in ignored evidence. The result and provider delivery summary are
`live-draft-verification.json` and `live-draft-delivery.json` in the dated private
evidence directory.

## Paid monthly subscription verification

The owner completed the real EUR 2 monthly purchase and reported payment
confirmation. Read-only Paddle and production database checks at 12:10–12:11 UTC
confirmed:

- The transaction is `completed`, with one captured EUR 2 payment, tax included.
- The live monthly subscription is `active`. Its paid period is 1 November to
  1 December 2026, at 12:09:20 UTC; renewal was scheduled for 1 December
  at that checkpoint. It was subsequently canceled as recorded below.
- The local subscription matches the provider and belongs to the selected owner.
- Exactly one payment row and one unrevoked, currently active payment-backed
  Premium grant exist for the transaction. Their dates match the provider period.
- All 13 genuine notifications, including `transaction.completed` and
  `subscription.created`/`subscription.activated`, were delivered on their first
  attempt with HTTP 200. All 13 corresponding live events were persisted and
  marked processed.
- Exactly one Premium subscription guide is linked to that grant and marked sent,
  with one delivery attempt. This is application delivery evidence; inbox receipt
  has not been independently checked.

These reads did not initiate a payment, synchronization, notification replay or
financial mutation. Multiple real lifecycle events produced a single payment,
grant and guide; a deliberate duplicate replay and missed-event recovery have
not been exercised in this live checkpoint. Unchanged application tests were
not repeated for this documentation-only update.

Private evidence: `live-payment-provider.json`, `live-payment-verification.json`
and `check-live-payment.mjs` under `.local/billing-live/2026-11-01/`. The checker
interprets Prisma's timestamp-without-time-zone columns as UTC before comparing
provider dates. No application code or deployment change was required.

## Renewal cancellation verification

The owner confirmed cancellation through **Your plan → Manage subscription**.
Read-only Paddle and production database checks at 12:15–12:16 UTC confirmed:

- Paddle's scheduled change is `cancel`, effective 1 December 2026 at
  12:09:20 UTC, and `next_billed_at` is null.
- The subscription correctly remains `active` until that end date. The local
  `cancelAt` matches the provider and local `nextBilledAt` is also null.
- The new `subscription.updated` notification was delivered on the first attempt
  with HTTP 200 and processed. All 14 events for the paid transaction and its
  subscription are now processed.
- Exactly one payment and one unrevoked, currently active Premium grant remain,
  with unchanged paid-period dates. The single guide remains marked sent.

Private evidence: `live-cancellation-provider.json`,
`live-cancellation-verification.json` and `check-live-cancellation.mjs` under the
same ignored dated directory. The checks made no financial or database mutations.

At the cancellation checkpoint, the next controlled check was a full EUR 2 refund of the original completed test
payment to its original payment method, with reason **Owner go-live acceptance
test**. That read found no existing adjustments. The connected live MCP does
not expose `adjustment.write` permission, so the owner can use the live dashboard's
**Transactions → original EUR 2 payment → Refund → Full refund**. No refund
request has been submitted by the release tooling. A pending request is not an
approved refund; verify the provider adjustment and payment-backed grant
revocation after approval. The final end-of-period cancellation event has not
occurred yet and is not claimed as tested.

## Refund request awaiting approval

The owner submitted the refund request through the live dashboard. Read-only
Paddle and production checks at 12:22 UTC confirmed:

- One EUR 2 refund adjustment exists for the original EUR 2 payment and its
  customer/subscription. Its status is `pending_approval`.
- The adjustment's `type` is `partial`, but its EUR 2 amount equals the entire
  original transaction total. Acceptance checks compare the approved refund
  amount with the captured total, consistent with the application logic.
- Its genuine `adjustment.created` notification was delivered on the first
  attempt with HTTP 200. The event was persisted and processed; all 15 events for
  the original transaction, subscription and adjustment are processed.
- The payment is correctly not yet marked refunded and its sole Premium grant is
  still unrevoked. A pending request does not remove paid access.
- Renewal remains canceled for 1 December; provider and local next billing dates
  remain null. No duplicate payment, grant or guide was created.

Private evidence: `live-refund-provider.json`, `live-refund-verification.json`
and `check-live-refund.mjs` under `.local/billing-live/2026-11-01/`. The checker
uses read-only queries and supports separate pending and approved outcomes.

Await Paddle's decision. Once approved, refresh the provider evidence and verify
that the approved cumulative refund covers the full payment, the local payment
is marked refunded and its payment-backed grant is revoked. Neither provider
approval nor return of funds to the payer has been observed yet. Full refund
acceptance and public sales remain pending; keep the owner-only restriction.
Preserve the tester restriction throughout acceptance. To pause checkout again,
deploy `PADDLE_CHECKOUT_ENABLED=0`; a project-variable edit alone does not change
the explicit flag on the already serving deployment.

Transaction-state reference checked 1 November:
[Paddle transaction creation](https://developer.paddle.com/api-reference/transactions/create-transaction/),
[issuing a refund](https://www.paddle.com/help/manage/your-customers/how-do-i-issue-refunds),
[adjustment creation and approval](https://developer.paddle.com/api-reference/adjustments/create-adjustment/).

## Approved full refund verification

After the owner reported **Full refund issued**, read-only Paddle and production
checks at 12:29 UTC confirmed the same EUR 2 adjustment is now `approved` and covers
the complete original payment. The `adjustment.updated` notification returned
HTTP 200 on its first delivery; all 16 related events are persisted and processed.
The existing payment is marked refunded and its existing payment-backed Premium
grant is revoked. Payment/grant history remains intact; no duplicate payment,
grant or guide was created. Renewal remains canceled with no next billing date.
The subscription's contractual cancellation is still scheduled for 1 December;
refund approval correctly ends access earlier. Return of funds to the payer's
bank account has not been independently observed.

Private evidence: `live-refund-approved-provider.json`,
`live-refund-approved-verification.json` and `check-live-refund-approved.mjs`.
The earlier pending-approval evidence above remains historical evidence of the
correct intermediate behavior.

The screenshot exposed contradictory presentation: Free access was correct, but
the cancellation explanation still promised remaining paid access and the refund
was styled as an error. The owner requested a UI clarification and approved an
explicit immediate re-subscription flow after full refund and canceled renewal.
See [the local follow-up](billing-refunds-resubscription-2026-11-01.md). These code
changes passed local static checks, 217 unit, 318 integration and 42 browser
checks, plus four focused checks after the final fresh build. They are separate
from the currently deployed commit and require review and release. Public checkout remains restricted to the owner account.
