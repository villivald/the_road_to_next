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

`check` runs linting, formatting, types, and unit tests. To test app workflows against a dedicated local database, first run `npm run prisma-seed -- --reset`, start the app, then run `npm run test:smoke`. **The seed deletes existing application data in the configured database; the smoke test creates records.**
