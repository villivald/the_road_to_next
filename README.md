## Run locally

Requires Node.js 24, npm, and Docker Desktop. Run all commands from the repository root (`the_road_to_next`), which contains `package.json`:

```bash
nvm use
npm ci
cp .env.example .env.local
npm run db:rebuild:up
npm run db:migrate
npm run dev
```

Skip the copy if `.env.local` already exists. It takes precedence over `.env`. Keep both private. Migrations target the database configured by `DIRECT_URL` (or `DATABASE_URL`); use a separate wishlist database.

After pulling changes that include database migrations, run `npm run db:migrate`
again before starting the app. Running Docker containers starts PostgreSQL but
does not apply schema changes. A missing-column error such as
`Media.variantWidths` means the configured database needs its pending migration.

## Services

| Service                | Start                   | Access                                  |
| ---------------------- | ----------------------- | --------------------------------------- |
| App                    | `npm run dev`           | [localhost:3000](http://localhost:3000) |
| Wishlist PostgreSQL    | `npm run db:rebuild:up` | `127.0.0.1:55432`                       |
| Local email inbox      | `npm run db:rebuild:up` | [localhost:8025](http://localhost:8025) |
| Inngest jobs           | `npm run inngest`       | [localhost:8288](http://localhost:8288) |
| Email template preview | `npm run email`         | [localhost:3001](http://localhost:3001) |
| Prisma Studio          | `npm run db:studio`     | [localhost:5555](http://localhost:5555) |

Register in the app, then open the local inbox for verification codes and reset links. Local email is captured by Mailpit; it is not delivered to recipients. For real delivery, unset `MAILPIT_URL` and configure `RESEND_API_KEY` and `EMAIL_FROM`. Hosted Inngest needs its event/signing keys with `INNGEST_DEV` unset.

After email verification, users receive a welcome guide. A confirmed new paid subscription or successful promo redemption queues a Premium guide. Inngest attempts newly queued messages immediately, with recovery every 15 minutes; run `npm run emails:deliver` for one due batch locally. All email templates share the app’s branding in English and Finnish. See [account email delivery and deployment](docs/account-emails.md) and [background job schedules and monitoring](docs/background-jobs.md).

Choose **English / Suomi** in the header. Both versions are also available directly at `/en` and `/fi`; your choice is saved for future visits.

Use the heart on lists, wishes, and people to add/remove private favorites in one
click. **Favorites** in the navigation keeps them under Lists, Wishes, and People.
Only items you can currently access appear there; saving never grants access.
Favorites work on Free and Premium. Reserving or canceling a wish preserves its
favorite; My reservations shows priority and cancellation controls. See
[favorites and rollout](docs/favorites.md).

To reserve a gift together, open a wish and choose **Reserve with others**. The
organizer reserves immediately, then searches for and invites people. Recipients
review and accept under **My reservations → Group invitations**. Names are shared
only after consent; invitations never grant private-list access. Groups support
leaving, removal, coordination transfer, and cancellation. Invitees receive an email;
organizers receive an acceptance email through immediate event-triggered delivery,
with a 15-minute recovery schedule for missed or failed attempts.
Apply both group migrations, including `20261019000100_group_reservation_emails`.
See
[group reservations and deployment](docs/group-reservations.md).

Images use private files in `.local/media` locally (no extra service). To use cloud storage, create a **private** Vercel Blob store, set `MEDIA_STORAGE=vercel` and its `BLOB_READ_WRITE_TOKEN` in `.env.local`, then restart. Use separate stores for development/preview and production. Add images when creating a wish, or upload them from List settings, Edit wish, or Your account.

Inngest runs media cleanup hourly; run `npm run media:cleanup` to process one batch manually. Keep Inngest running for automatic cleanup.

Invite people from a list’s **Sharing and members** page; local invitations arrive in Mailpit. Delivery is attempted immediately; failed sends are recovered through Inngest every 15 minutes, respecting backoff, or run `npm run invitations:deliver` for one batch. Joined lists appear under **My lists → Lists you’ve joined**.

For read-only access without an account, open **List settings → Manage guest links**. The list owner needs Premium to create links; choose **Show list** in List settings, copy the new link, and share it privately. Links expire and can be revoked there.

Stop the local services with `npm run db:rebuild:down`; development database data is retained.

## Promo codes

Redeem codes at **Account → Your plan and promo codes**. To issue a code using the configured database:

```bash
npm run promo -- create --label "Trial" --days 30 --uses 1 --valid-for-days 7
npm run promo -- list
npm run promo -- revoke --id PROMO_ID
```

Creation prints the code once; keep it private. Revocation stops new redemptions but preserves granted access.

## Subscription testing

Local development needs no Paddle setup; promo codes remain available. Hosted sandbox testing follows deployment. After configuration, use **Account → Your plan and promo codes**. Inngest handles billing reconciliation and cancellation retries; `npm run billing:sync` runs one due batch, and `npm run billing:sync -- --status` shows pending issues for the configured database. Real payments are disabled.

## Deployment directory

The Next.js app lives at the repository root. In Vercel, open **Project Settings → Build and Deployment → Root Directory** and clear the old `the-road-to-next-app` value before deploying this structure. Leave the field empty to use the repository root. Keep the Next.js framework preset and remove any custom command prefix that changes into the old folder. See [Vercel's root-directory settings](https://vercel.com/docs/builds/configure-a-build#root-directory).

The folder move requires no database migration or environment-variable changes. Private environment files and local uploads stay ignored. `Notes.md` and `img/` are personal reference material, preserved locally and excluded from Git.

## Test

```bash
npm run check
npm run test:integration
npx playwright install chromium
npm run test:e2e
npx playwright install firefox webkit
npm run test:e2e:cross-browser
npm run test:e2e:auth-protection
```

Install Chromium once. Database/browser tests require Docker and use `wishlist_test`, schema `wishlist`, on port 55433 and an isolated inbox on port 8026. Browser tests build the production app and use port 3017. To build separately, run `npm run build`.

Run the browser suites sequentially: they share the isolated database and port.
The cross-browser suite checks recovery forms, localization, accessibility,
groups, guest access, and billing in Firefox and WebKit. WebKit automation does
not establish real-device Safari or VoiceOver behavior; record those checks
separately.

Before deploying account forms, configure the Turnstile site/secret keys described
in [account abuse protection](docs/account-abuse-protection.md). Hosted signup,
recovery requests, and verification resend fail closed without them. The dedicated
auth-protection suite uses isolated provider fixtures; the ordinary suite retains
local native-form coverage. No database migration is needed for these controls.

Reusable setup, architecture, and migration documentation lives in `docs/` and is
versioned with the code. Keep per-run acceptance reports, screenshots, and private
test evidence in the Git-ignored `.local/` folder.
