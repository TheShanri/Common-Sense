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

Next.js automatically loads variables defined in `.env.local`. Copy the sample file and adjust the values for your environment:

```bash
cp .env.example .env.local
```

Open `.env.local` and update:

- `DATABASE_URL` – keep the Supabase connection pooling string provided in the sample file or paste the value from **Project Settings → Database → Connection pooling**. Pooling is strongly recommended for Vercel so each serverless invocation reuses a tiny number of connections (`pgbouncer=true&connection_limit=1`).
- `JWT_SECRET` – replace the placeholder with a randomly generated secret that is at least 32 characters. `openssl rand -hex 32` is a quick way to generate one.

The helper in `lib/env.ts` validates both variables on boot. If either value is missing or too short, the server will crash with a clear error message so you can fix the configuration.

If you run Postgres locally without SSL you can switch off TLS by setting `DATABASE_SSL=false` in `.env.local`.

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

## Supabase setup checklist

Follow these steps once for each Supabase project (development, staging, or production):

1. **Create the project** – From the Supabase dashboard choose **New project**, pick a region close to your users, and note the generated database password (you can always rotate it later).
2. **Run the schema** – Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and execute it. The script is idempotent and seeds default modules, quizzes, and opinion prompts.
3. **Enable connection pooling** – Visit **Project Settings → Database → Connection pooling** and copy the `pgbouncer` connection string. It already includes the right port (`6543`) and parameters. Append `&connection_limit=1` if the UI does not add it automatically, then use this value for `DATABASE_URL` in your environments.
4. **(Optional) Verify tables** – Use the Table Editor or run `\dt` in the Supabase SQL editor to confirm the schema is present. You can also insert a test user with the `/register` page locally.

Repeat the SQL step any time you make changes to `supabase/schema.sql`.

## Deploying to Vercel

Once your Supabase project is ready, Vercel deployment is a matter of wiring up the repository and environment variables:

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel dashboard click **New Project → Import Git Repository** and select your repo.
3. When prompted for environment variables, add at minimum:
   - `DATABASE_URL` – the Supabase connection pooling string (for example the one in `.env.example`).
   - `JWT_SECRET` – the same 32+ character secret you used locally.
   - Optional overrides: `DATABASE_SSL`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT`, `DATABASE_CONNECTION_TIMEOUT`.
4. Accept the default build settings (`npm install`, `npm run build`, output directory `.next`). The project targets the Node.js runtime so no extra configuration is required.
5. Trigger the first deploy. After it finishes, open the deployment URL, register a new account, and walk through the dashboard to confirm database reads and writes work end-to-end.

Tip: run `npm run build` locally before pushing to catch any TypeScript or build-time issues early.

## Troubleshooting

- **`Invalid environment configuration` on startup** – Double-check that `.env.local` exists, that `JWT_SECRET` is at least 32 characters, and that the file is readable by Next.js.
- **Database connection errors** – Confirm the connection string works by running `psql "$DATABASE_URL"`. If you see SSL-related errors, make sure `?sslmode=require` is appended. For local databases without SSL, remove the `sslmode` parameter.
- **Too many connections** – Supabase limits direct Postgres connections. Make sure you are using the connection pooling string (port `6543` with `pgbouncer=true&connection_limit=1`) in production and on Vercel.
- **`pgcrypto` extension errors** – Supabase has the `pgcrypto` extension available by default. If you use a different Postgres instance, you may need to run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` manually before applying the schema.
- **Changes not appearing in the UI** – The dashboard queries the API routes on each load. Inspect server logs in the terminal running `npm run dev` for helpful error messages.

## Additional resources

- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Supabase Database connection guides](https://supabase.com/docs/guides/database/connecting)
- [node-postgres SSL configuration reference](https://node-postgres.com/features/connecting#ssl)

Following the steps above should let you run the application locally end-to-end. If you run into anything unclear, feel free to share the terminal output and we can debug further.
