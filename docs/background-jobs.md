# Background jobs and database activity

Urgent work starts from a saved database intent. Account/group emails publish
`wishlist/account-email.queued` after their transaction commits. A verified Paddle
webhook saves its `BillingEvent` before publishing `wishlist/billing-event.received`.
The webhook route schedules publishing with Next.js `after`, so an event-service
outage cannot hold up Paddle's acknowledgement. If post-response work is
interrupted, the saved event remains available for scheduled recovery.
Only opaque row IDs leave the app in these events. List membership invitations
retain their existing immediate delivery attempt.

Inngest handles the new events using the existing function IDs. Each event targets
one email or billing event, so immediate work is not held behind the recovery
batch. Billing resolves the trusted provider resource and synchronizes the affected
account; a webhook payload alone never grants Premium. Payment synchronization
also triggers any newly committed Premium guide.

## Recovery and schedules

| Function                   | Immediate trigger            | Scheduled recovery (UTC) |
| -------------------------- | ---------------------------- | ------------------------ |
| `deliver-account-emails`   | Saved account/group email    | `*/15 * * * *`           |
| `deliver-list-invitations` | Existing invitation action   | `*/15 * * * *`           |
| `reconcile-paddle-billing` | Saved, verified Paddle event | `*/15 * * * *`           |
| `cleanup-media`            | None                         | `0 * * * *`              |
| `expire-auth-data`         | None                         | `0 3 * * *`              |

Keep recovery jobs aligned at :00, :15, :30 and :45. Staggering them can leave
little time for Neon to sleep. Media cleanup keeps its existing eligibility,
atomic claims, and backoff; hourly scheduling can retain detached files longer.
Authentication and guest-link expiry are checked on access, independently of
daily record cleanup.

The four changed schedules produce 9,360 runs per 30 days, down from 34,560
(about 73% fewer). The unchanged daily authentication job adds 30 runs.
Event-triggered runs, durable steps, retries and real user traffic are additional;
these counts are not a forecast of provider billing or Neon savings.

An event-publishing failure logs a sanitized warning and leaves the successful
user operation intact. The scheduled worker recovers the saved intent. SDK
requests have a two-second timeout per attempt; publishing may retry, so an
Inngest outage can add several seconds to an initiating user action, but does not
delay the webhook acknowledgement. A missing or
invalid event key falls back to the schedule and must be corrected, not ignored.

Recovery still respects due times and bounded batches: 20 account emails,
10 list invitations, 20 billing events and 5 billing accounts per run. Missed
triggers normally recover at the next quarter-hour; backoff, provider outages,
expired leases and a backlog can take longer. Monitor pending work rather than
treating 15 minutes as a delivery guarantee.

Email claims, immutable requests, Resend idempotency keys and the eight-attempt /
23-hour cutoff are unchanged. Billing keeps its account leases, revisions,
deduplicated grants, refund checks and deleted-account cancellation recovery.
Repeated triggers safely recheck current database state. No in-memory timer or
unawaited promise is relied on for delivery.

## Deployment and verification

1. Run `npm run check`, `npm run test:integration`, and the affected browser tests
   against the isolated test database. Never run the test seed against Neon.
2. Review, commit and deploy the change. **No database migration is required.**
3. Confirm production has the existing `INNGEST_EVENT_KEY` and
   `INNGEST_SIGNING_KEY`; `INNGEST_DEV` must be unset. Do not paste keys into logs
   or chat. Ensure the event key belongs to the same Inngest environment as the
   deployed app. Local development uses `npm run inngest`.
4. Check the deployed Inngest app's function configuration. Resync it if needed.
   Confirm the table above, including both new event triggers; there should be
   no leftover five-minute schedules for these functions or a stale app deployment.
5. With authorized test accounts, send a group invitation, accept it and redeem
   a test promo or verify a new account. Confirm immediate event runs and one
   correctly localized message per action. Use only Paddle sandbox for a billing
   smoke check; verify the saved webhook is processed and the correct grant/guide
   appears. Do not submit a real payment for this check.
6. Observe a quarter-hour recovery run and an hourly cleanup run. Check results,
   not only HTTP 200s: pending/failed emails, old unprocessed billing events,
   accounts with repeated sync failures, and media deletion failures need review.
   Test provider outages locally; do not disable production services to test recovery.

The integration suite uses a mocked event publisher plus the real database and
workers to verify post-commit visibility, failed-publish recovery and deduplication.
Browser tests acknowledge events only at their isolated local fixture endpoint;
they do not establish hosted Inngest delivery. That requires the smoke check above.

## Monitor Neon for 3–7 days

Start the comparison after deployment and Inngest sync. Confirm the monitored
project/branch/endpoint matches the app's database; other active branches and
replicas contribute to usage too.

Once daily, record cumulative CU-hours, compute size, active versus suspended
periods, database storage, and unusual test/traffic activity. Use Neon's console
usage metrics, not frequent SQL health checks or an open auto-refreshing database
browser, which can themselves create database activity. Leave scale-to-zero at
five minutes for this comparison.

Compare daily CU-hour increments, especially on quiet nights. Project monthly
compute as `daily CU-hours × 30`; on Launch multiply by the current CU-hour rate,
then add actual storage/history and applicable extras/tax. Do not project the
whole month from one unusually busy QA day. Watch the remaining Free allowance
and reset date during the experiment; reducing future activity does not restore
already consumed hours.

With perfectly aligned, short quarter-hour jobs and no other queries, a
five-minute idle timeout suggests roughly eight active hours/day. This is only
an idealized baseline: job duration, scheduling skew, retries and user traffic
can keep the database awake longer. Success is lower measured CU consumption
with prompt normal delivery and no growing recovery backlog.
