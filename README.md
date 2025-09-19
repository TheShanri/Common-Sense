# Common Sense Exchange

A Next.js learning and dialogue platform designed for Vercel + Supabase deployments. Members can:

- Register and sign in with email/password credentials stored securely in Supabase Postgres.
- Work through curated learning modules and track completion progress.
- Take mastery quizzes tied to each module and receive scored feedback.
- Share their perspective on civic topics, get matched with someone of slightly different views, and chat in a moderated space.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the `.env.example` file to `.env.local` and update the values as needed. The provided Supabase database string points to the project mentioned in the prompt.

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   - `DATABASE_URL` – Supabase Postgres connection string.
   - `JWT_SECRET` – a 32+ character random string used for signing JWT session cookies.
   - Optional `DATABASE_SSL=false` if developing against a local Postgres instance without SSL.

3. **Apply the database schema**

   The `supabase/schema.sql` file defines all tables, indexes, and seed data used by the application. Run it against your Supabase database (for example via the Supabase SQL editor or `psql`).

   ```sql
   \i supabase/schema.sql
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to access the app.

## Key implementation details

- **Authentication** – Custom email/password auth with bcrypt hashing and signed JWT cookies. See `app/api/auth/*` and `lib/auth.ts`.
- **Data access** – Typed data helpers live in `lib/storage.ts` and operate through a shared Postgres pool in `lib/db.ts`.
- **UI** – Built with the Next.js App Router. Auth pages live under `app/(auth)`, while the authenticated dashboard is in `app/(dashboard)` with client components handling stateful interactions.
- **Chat matching** – Users submit opinion quiz answers that generate an orientation score. Matching pairs users with at least a 0.5 point difference to encourage varied perspectives.

## Testing & linting

Run ESLint to ensure code quality:

```bash
npm run lint
```

(Additional automated tests can be added as the project evolves.)
