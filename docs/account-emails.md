# Account emails

Wishlist sends a practical welcome guide after successful email verification.
It sends a Premium guide after the first confirmed payment for a new Paddle
subscription, and an access-update guide after each successful promo redemption.
Recurring payments and repeated verification or billing events do not resend the
welcome guides. Existing accounts are not enrolled retroactively.

The guides use short numbered steps, bullet lists, and compact access summaries.
They cover list creation, visibility, sharing, reservations, public profiles,
and Premium’s actual benefits and limits. Paid and promo messages have different
access and billing explanations. Promo extensions show the added period, which
can start after current access. Dates use Finland time and the account’s stored
English or Finnish language at the time the message is queued.

## Design and preview

All five templates share `src/emails/components/layout.tsx`: warm paper, ink text,
yellow actions, muted green notes, serif headings, and the existing heart and
wordmark. The PNG logo works in clients without SVG support; the surrounding
content remains readable when images are blocked. System font fallbacks avoid
depending on email clients loading the app’s web fonts. HTML uses inline styles
and presentation tables, with a plain-text alternative.

Run the app and `npm run email`, then open <http://localhost:3001> to preview the
templates in `src/emails`. The app serves the logo at `/email-brand.png`.
To regenerate that asset after a brand change:

```bash
node --import tsx scripts/prepare-email-brand.ts
```

The source wordmark’s existing font license remains in
`src/assets/branding/OFL.txt`; the heart follows the existing Lucide shape.

## Delivery

The account or Premium transaction creates an `AccountEmail` row with the complete
rendered message, sender, recipient, and a unique lifecycle key. If the transaction
rolls back, the email is not queued. A provider failure does not undo an account,
redemption, or payment.

Inngest’s `deliver-account-emails` job processes up to 20 messages every five minutes.
Messages normally leave on the next scheduled run. Matching the existing
five-minute jobs keeps the four periodic maintenance functions at approximately
34,560 scheduled executions per 30 days, before retries and other activity,
within [Inngest’s current 50,000-execution free allowance](https://www.inngest.com/pricing). Local delivery goes to Mailpit.
To process one due batch manually, using the database in `.env.local` / `.env`:

```bash
npm run emails:deliver
```

Workers claim rows atomically with a two-minute lease. Retries use the saved
message and the same Resend idempotency key, with backoff from two minutes to one
hour. Delivery stops after eight attempts or 23 hours from the first attempt,
before [Resend’s 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)
expires. Inspect `sentAt`, `deliveryFailedAt`, `deliveryAttempts`, and
`nextAttemptAt` in Prisma Studio to diagnose delivery. Counts from the job contain
no recipient addresses or message content. Do not automatically reset failed
rows: an ambiguous send might already have reached the recipient.

Unverified accounts, changed recipient addresses, and revoked or expired Premium
grants are skipped. Deleting an account deletes its queued messages and rendered
content. Successful or canceled delivery clears the rendered message bodies;
sent rows retain the lifecycle key and delivery metadata to prevent duplicate
guides without accumulating copies of long emails.

## Deployment

1. Apply migration `20261014000200_account_emails` to the intended database with
   `npm run db:migrate` before deploying the new code. Verify the environment and
   database target first; local commands prefer `.env.local`.
2. Deploy the code and the public logo asset. No new environment variables are
   required: use the existing `APP_URL`, `EMAIL_FROM`, `RESEND_API_KEY`, and Inngest
   configuration. Production must not set `MAILPIT_URL`.
3. Confirm that the deployed Inngest app shows `deliver-account-emails` and its
   five-minute schedule. Refresh its app sync if the function list is stale.
4. Verify a new test account’s email. Check the welcome email in Resend and its
   `AccountEmail.sentAt` record. With Paddle sandbox, complete one subscription
   and confirm the Premium guide. Redeem a separate test promo code and confirm
   the promo access-update guide.
5. Open delivered messages on desktop and mobile in the email clients you use.
   Browser previews validate layout, but are not a substitute for Gmail, Apple
   Mail, and Outlook delivery checks. Confirm links use the deployed app URL.

This is transactional account guidance, not a newsletter or a bulk campaign.
Paddle continues to handle payment receipts; these guides do not replace receipts
or claim that a checkout return alone confirms payment.
