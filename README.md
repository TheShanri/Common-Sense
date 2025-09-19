# Common Sense Exchange

Common Sense Exchange is a Next.js learning and dialogue platform designed for Vercel + Supabase deployments. The application lets people:

- Register and sign in with email/password credentials stored securely in Supabase Postgres.
- Work through curated learning modules and track completion progress.
- Take mastery quizzes tied to each module and receive scored feedback immediately.
- Answer perspective questions, get matched with someone who thinks a little differently, and continue the conversation in a chat interface.

The sections below walk through the entire local setup process in more detail and highlight how the pieces fit together.

## Prerequisites

- **Node.js 18+** – Matches the Vercel runtime and the version declared in the project (use [nvm](https://github.com/nvm-sh/nvm) or Volta if you manage multiple versions).
- **npm 9+** – Bundled with Node.js and used for dependency management.
- **Supabase project (or any Postgres database)** – The provided Supabase connection string from the prompt will also work for local development.
- **`psql` client or Supabase SQL editor access** – Needed to run the schema and seed script located in `supabase/schema.sql`.
- (Optional) **OpenSSL or another secret generator** – Handy for creating a secure JWT signing secret.

## 1. Install dependencies

Clone the repository (if you have not already) and install JavaScript dependencies.

```bash
npm install
```

The project uses the Next.js App Router, TypeScript, and ESLint. All required packages are captured in `package.json` and fetched by the command above.

## 2. Configure environment variables

Next.js automatically loads variables defined in `.env.local`. Create this file in the repository root and supply at least the following values:

```bash
# .env.local
DATABASE_URL=postgresql://postgres:SLFN9tTv5Pg8Co0F@db.gsyollllatxbhynvxzjh.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=change-me-with-a-32-plus-character-secret
```

Notes:

- Replace `JWT_SECRET` with a long random string. You can generate one with `openssl rand -hex 32` or an equivalent command.
- If you are using a different Supabase project, copy its connection string from **Project Settings → Database** and append `?sslmode=require` so Node's Postgres client negotiates SSL correctly.
- The helper in `lib/env.ts` validates that `JWT_SECRET` is at least 32 characters. If it is missing or too short, the server will throw an error on startup.

If you run the database locally (without SSL), use your local connection string instead and omit the `sslmode` parameter.

## 3. Apply the database schema and seed data

Run the SQL script against your Supabase/Postgres instance to create all tables, indexes, and default content.

```bash
# With the `psql` CLI installed locally
psql "$DATABASE_URL" -f supabase/schema.sql

# Or paste the contents of supabase/schema.sql into the Supabase SQL editor and run it once
```

The script is idempotent: you can re-run it safely and it will upsert the seed data for learning modules, quizzes, questions, and opinion prompts.

After it finishes, you can verify the tables were created by connecting with `psql "$DATABASE_URL"` and running `\dt`.

## 4. Start the development server

With dependencies installed and the database ready, start Next.js:

```bash
npm run dev
```

The server boots on [http://localhost:3000](http://localhost:3000). Visit the site and use the **Register** page to create a new account; the app will automatically log you in and redirect to the dashboard.

## 5. Useful development scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js dev server with hot reloading. |
| `npm run lint` | Runs ESLint with the rules defined in `.eslintrc.json`. |

Adding automated tests? Place them under a `tests` directory and wire up another npm script.

## Project structure

```
app/
  (auth)/        → Login and registration routes
  (dashboard)/   → Authenticated layout and dashboard view
  api/           → Route handlers for auth, modules, quizzes, and chat
components/      → Client components (module list, quiz list, chat UI, etc.)
lib/             → Database client, environment helper, auth utilities, and data access layer
supabase/        → SQL schema and seed data
```

The `lib/storage.ts` module is the single interface used by API routes to query and mutate data. It centralizes SQL statements and ensures consistent error handling.

## Deployment notes (Vercel + Supabase)

1. Push this repository to GitHub or GitLab.
2. Create a Vercel project and import the repository.
3. In the Vercel dashboard, add the same `DATABASE_URL` and `JWT_SECRET` values under **Settings → Environment Variables**.
4. Trigger a deploy; Vercel will run `npm install` and `npm run build` automatically.
5. Ensure the Supabase schema has been applied once in production (run the same `supabase/schema.sql` script against your production database).

## Troubleshooting

- **`Invalid environment configuration` on startup** – Double-check that `.env.local` exists, that `JWT_SECRET` is at least 32 characters, and that the file is readable by Next.js.
- **Database connection errors** – Confirm the connection string works by running `psql "$DATABASE_URL"`. If you see SSL-related errors, make sure `?sslmode=require` is appended. For local databases without SSL, remove the `sslmode` parameter.
- **`pgcrypto` extension errors** – Supabase has the `pgcrypto` extension available by default. If you use a different Postgres instance, you may need to run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` manually before applying the schema.
- **Changes not appearing in the UI** – The dashboard queries the API routes on each load. Inspect server logs in the terminal running `npm run dev` for helpful error messages.

## Additional resources

- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Supabase Database connection guides](https://supabase.com/docs/guides/database/connecting)
- [node-postgres SSL configuration reference](https://node-postgres.com/features/connecting#ssl)

Following the steps above should let you run the application locally end-to-end. If you run into anything unclear, feel free to share the terminal output and we can debug further.
