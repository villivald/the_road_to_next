## Run locally

Requires Node.js 24, npm, and Docker Desktop. Run from `the-road-to-next-app`:

```bash
nvm use
npm ci
cp .env.example .env.local
npm run db:rebuild:up
npm run db:migrate
npm run dev
```

Skip the copy if `.env.local` already exists. It takes precedence over `.env`. Keep both private. Migrations target the database configured by `DIRECT_URL` (or `DATABASE_URL`); use a separate wishlist database.

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

Stop the local services with `npm run db:rebuild:down`; development database data is retained.

## Test

```bash
npm run check
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Install Chromium once. Database/browser tests require Docker and use `wishlist_test`, schema `wishlist`, on port 55433 and an isolated inbox on port 8026. Browser tests build the production app and use port 3017. To build separately, run `npm run build`.
