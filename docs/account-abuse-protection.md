# Account signup and email abuse protection

Signup, password recovery, and verification-email resend use server-validated
Cloudflare Turnstile, a hidden honeypot, source request limits, and a shared
recipient email budget. This addresses repeated signup → immediate password-reset
requests without treating unfamiliar email addresses as confirmed attackers.

## Behavior

| Control                         | Limit / behavior                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Signup source                   | 5 attempts per 15-minute window; 20 per UTC day, across email addresses                                        |
| Combined account-email source   | 20 requests per 15-minute window across signup, recovery, and verification resend                              |
| Signup email                    | Existing 5 attempts per 15-minute window                                                                       |
| Recovery email                  | Existing 3 requests per 15-minute window; neutral response for known/unknown accounts                          |
| Verification resend account     | Existing 3 requests per minute; actual sends also use the combined recipient budget                            |
| Combined recipient email budget | 1 send per rolling 60 seconds, 3 per UTC hour, 8 per UTC day across initial verification, resend, and recovery |

Source limits use Vercel's trusted `x-vercel-forwarded-for` value, not arbitrary
client-provided forwarding headers. Local/non-Vercel environments use a shared
fallback bucket. Counters persist in the existing `AuthRateLimit` table; their
keys hash identities, and the existing auth cleanup removes expired records.
There is no new polling job or database migration.

The one-minute cooldown is rolling, including across minute/hour boundaries.
Hourly/daily budgets and source limits use fixed UTC windows and can reset at a
boundary. Concurrent reservations are serialized in a short database transaction;
rejected reservations roll back counters and do not extend the cooldown.

A signup creates an unverified account before email verification. Recovery remains
available to unverified accounts: a real person can forget a password before
finishing verification. Signup followed immediately by recovery returns the usual
neutral recovery response but sends no second email during the cooldown. The form
explains the wait. Duplicate requests do not rotate an existing reset link or
verification code. Delivery failure still consumes the send reservation; wait at
least a minute before retrying. Provider errors are not exposed to visitors.

Verification emails/code entry and account access remain separate. Passing a bot
challenge does not verify email ownership or grant access. Existing sessions,
sign-in, password-reset submission, guest links and billing are not challenged.
The app does not delete existing unverified accounts, infer abuse from names or
domains, or strip Gmail dots/aliases from account identities.

## Configure before production deployment

1. In Cloudflare Turnstile, create a **Managed** widget for Wishlist. Turnstile
   works with Vercel; DNS does not need to move to Cloudflare. Its
   [Free plan](https://developers.cloudflare.com/turnstile/plans/) includes
   unlimited challenges and is sufficient for this integration.
2. Restrict the widget to `wishlist.fi` and keep `APP_URL=https://wishlist.fi`.
   In Vercel, ensure `www.wishlist.fi` redirects to `wishlist.fi` before serving
   forms. The backend requires the returned hostname to match `APP_URL` exactly;
   adding an alias to the widget alone does not authorize that second hostname.
   Do not allow wildcard or local hostnames on the production widget.
3. In Vercel's Production environment, set
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the widget's public site key and
   `TURNSTILE_SECRET_KEY` to its secret. Never put the secret in a `NEXT_PUBLIC_`
   variable, repository, screenshot, log, or chat.
4. Use separate widget/keys and the matching `APP_URL` for Preview/staging. Do not
   share production keys with local testing or allow local hostnames in the
   production widget. Keep `MAILPIT_URL` and `INNGEST_DEV` unset in production.
5. Build and deploy after setting both values. The public site key is embedded at
   build time; changing either variable requires a fresh deployment. No migration
   is needed.

**Vercel fails closed:** the build/configuration check rejects missing keys, so an
unconfigured deployment cannot replace the existing working version. At request
time signup, recovery requests and verification resend return an availability
error if keys are missing or validation cannot complete. Configure both keys
before deploying this change. Other account operations
continue working. Local development without either key keeps native forms and
Mailpit usable; a partially configured local environment also fails closed.
Non-Vercel hosting must configure both keys to enable the challenge and must
replace the shared source bucket with a trusted proxy integration if needed.

Validation requires one bounded token, provider success, the exact expected
action (`sign_up`, `password_recovery`, or `verification_resend`), and the
configured hostname. Siteverify has a five-second timeout and rejects redirects;
failures never fall back to allowing a request. Cloudflare enforces single-use
tokens and five-minute expiry. Tokens/honeypot values are removed from returned
form payloads and are never logged. The backend does not send a visitor IP to
Siteverify. The widget itself processes browser/device signals; the EN/FI privacy
page describes this additional security provider.

Only protected forms load the official Turnstile script. The widget uses a
65px-high, full-width horizontal layout when its form has at least 300px available;
below Cloudflare's minimum it falls back to compact mode without scaling or
clipping the challenge. It follows the app's theme and EN/FI locale, and gets a
fresh token after each completed action or size-mode change. Expiry/errors clear the token and offer Retry.
JavaScript is required to obtain a challenge for these three email-producing
forms; native posts still work after obtaining a valid token. Opening and
submitting an already-issued password-reset link still works without JavaScript.
Ad blockers/script outages can prevent a challenge; show the retry feedback and
use `support@wishlist.fi` for assistance rather than bypassing verification.

## Verification

Run sequentially from the repository root:

```sh
npm run check
npm run test:integration
npm run test:e2e
npm run test:e2e:auth-protection
```

The ordinary suite clears both Turnstile values and captures mail locally. The
dedicated suite builds with isolated fixture values and simulates browser and
Siteverify responses, including action binding and token replay. Its preload is
restricted to the exact local test database/origin and is never imported by the
application. No production test-bypass header, alternate verification URL, or
accept-any-token mode exists. These tests establish application behavior, not
Cloudflare's real bot-detection accuracy.

After deployment, using only a mailbox you control:

1. Check EN/FI signup and recovery, light/dark mode, and a narrow viewport. Confirm
   the real challenge loads and does not overflow; check keyboard behavior.
2. Create one account, verify one verification email arrives, then immediately
   request recovery. Confirm the neutral response and no second email. Wait over
   a minute and request recovery again; confirm the reset link works.
3. Request resend/recovery twice in quick succession. Confirm only one message and
   that the previously delivered code/link remains usable.
4. Check Cloudflare validation metrics and Vercel errors for availability or
   hostname/action mismatches. Do not disable Resend suppressions or send tests
   to strangers' addresses.

Monitor signup attempts versus successful verification, recovery/send volume,
bounces/complaints, rate-limit feedback and shared-network false positives. Review
the initial conservative source limits if legitimate users are blocked. Correlate
available provider/request evidence before classifying or deleting accounts. If
distributed abuse persists, assess edge rate limits and a global send circuit
breaker against actual volume; per-recipient/source limits are not a global
quota guarantee. Revisit this before increasing email/hosting spend.

References: [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/),
[server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/),
[testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
