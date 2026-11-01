# Monthly pricing change — 1 November 2026

The proposed public prices are €3/month and €15/year, including applicable
tax. Annual billing saves €21 (58.3%) compared with twelve monthly payments.
The code is prepared locally; this document does not record a production rollout.

## Application changes

- The shared plan configuration uses `300` euro cents for monthly checkout;
  annual checkout remains `1500`.
- English and Finnish price labels and annual savings copy match the new amounts.
  The public Premium page calculates the percentage from the shared amounts.
- Canceled subscription cards no longer display today's catalog price as if it
  were the historical subscription price. Original invoices and refunds remain
  available in Paddle.
- Test catalog responses and refund fixtures use the new monthly amount.
  Checkout still rejects a provider catalog amount that differs from the app.
- No database migration, new dependency, webhook change, or credential rotation
  is needed. Checkout remains restricted to the existing owner tester.

## Paddle and deployment sequence

Read-only Paddle live checks on 1 November confirmed the catalog still charges
€2/month and €15/year, with no active, paused, past-due, or trialing subscriptions.
The MCP connection has `price.read` but lacks `price.write`.

1. Review and commit the application changes locally. Do not push yet: pushing
   `main` triggers the production deployment.
2. In Paddle live, open **Catalog → Products → Wishlist Premium**, edit the
   existing **Monthly subscription** price, and change the amount from €2 to €3.
   Preserve EUR, monthly billing, tax-inclusive calculation, quantity one, and
   no trial. Keep the same price ID. Leave the €15 yearly price unchanged.
   Alternatively, grant `price.write` to the existing MCP connection under
   **Connectors → MCPs** so the change can be applied and verified through MCP.
3. Apply the same amount to the corresponding monthly price in Paddle sandbox
   before using sandbox checkout with this code. Sandbox and live are independent.
4. Read back both prices, then push/deploy the application. Do not start checkout
   during the transition: the old build rejects the new provider amount, and the
   new build rejects the old amount.
5. Check `/en/premium`, `/fi/premium`, and the signed-in plan page for €3/month,
   €15/year, and the updated savings. Start a fresh owner-only monthly checkout
   and verify Paddle displays €3 before submitting any payment. A new payment
   is not required for this price-label check.

Keeping the existing price ID means `PADDLE_MONTHLY_PRICE_ID` and
`PADDLE_ANNUAL_PRICE_ID` stay unchanged. If a new price is created instead,
stop before changing environment variables: reconciliation currently recognizes
the configured IDs, so historical price-ID support would need to be added first.

The completed €2 payment/refund acceptance records remain historical evidence;
they must not be rewritten to say €3. If future price changes affect existing
subscribers, handle their subscription price snapshots separately from catalog
prices and show their actual agreed price in the application.

## Validation

- `npm run check`: ESLint, Stylelint, Prettier, type checks, and 221 unit tests passed.
- `npm run test:integration`: 318 tests passed, including cancellation,
  re-subscription, partial/cumulative refunds, and independent promo access.
- Billing/localization browser suites: 42 tests passed in desktop/mobile Chromium.
  EN/FI pricing, narrow dark layouts, keyboard access, and accessibility were checked;
  the Finnish pricing screenshot was visually reviewed.
- Both locally rendered public Premium pages returned HTTP 200 with €3/month,
  €15/year, and the correct localized 58.3% / 58,3% annual savings.
- Refund unit coverage includes both historical €2 and current €3 payments.
  A separate regression confirms checkout fails closed while Paddle still has €2.
- The production build passed with the existing local-media tracing warning in
  `src/features/media/service/storage.ts`; no new build warning was introduced.
