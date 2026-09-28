## Run locally

Requires Node.js 24, npm, and PostgreSQL. Docker Compose can run PostgreSQL for you. Run these commands from `the-road-to-next-app`; skip `cp` if `.env` already exists:

```bash
nvm use
cp .env.example .env
npm ci
docker compose up -d --wait
npm run db:push
npm run dev
```

If `.env` already exists, add any missing variables from `.env.example`. Set `DATABASE_URL` and `DIRECT_URL` to your own PostgreSQL instance if you are not using Docker. Keep `.env` private. `db:push` changes the configured database schema, so use a development database.

Start Inngest in another terminal using the command below. The app's `.env` must contain `INNGEST_DEV=1` for local jobs; restart `npm run dev` after changing `.env`. Email delivery needs `RESEND_API_KEY` and `EMAIL_FROM`; attachments need the `AWS_*` settings shown in `.env.example`.

## Services

| Service                | Start                         | Access                                  |
| ---------------------- | ----------------------------- | --------------------------------------- |
| App                    | `npm run dev`                 | [localhost:3000](http://localhost:3000) |
| PostgreSQL             | `docker compose up -d --wait` | `localhost:5432`                        |
| Inngest                | `npm run inngest`             | [localhost:8288](http://localhost:8288) |
| Email template preview | `npm run email`               | [localhost:3001](http://localhost:3001) |
| Prisma Studio          | `npm run db:studio`           | [localhost:5555](http://localhost:5555) |

The email preview displays templates; sending emails requires Resend. Stop PostgreSQL with `docker compose down` (data is retained).

## Test

```bash
npm run check
npm run build
```

`check` runs linting, formatting, types, and unit tests.

For isolated desktop/mobile browser checks, start Docker Desktop, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

This prepares `wishlist_test` on port 55433, replaces its named test fixtures, builds the app, and starts its own server on port 3017. It uses no real service credentials. Stop the rebuild databases with `npm run db:rebuild:down`; the test database is disposable and the separate development volume is retained.
