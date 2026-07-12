# Deploying ASCEND//SYSTEM to Vercel

Your database (Supabase) is already created, migrated, and seeded — production
will use that **same** database, so there is nothing to re-seed. You only need to
put the Next.js app on Vercel and give it the environment variables.

Git is **not** installed on this machine, so there are two paths:

- **Path A — Vercel CLI (no Git needed).** Fastest. Recommended for you.
- **Path B — GitHub + Vercel.** Standard; needs Git installed. Enables auto-deploy on push.

---

## Environment variables Vercel needs

Add these in the Vercel project (Settings → Environment Variables), for the
**Production** (and Preview) environments. Copy the values from your local `.env`:

| Key | Value / note |
|---|---|
| `DATABASE_URL` | Your Supabase connection string (see pooling note below) |
| `DIRECT_URL` | Supabase **direct** connection (port 5432) |
| `AUTH_SECRET` | The generated secret in your `.env` |
| `AI_PROVIDER` | `gemini` |
| `AI_API_KEY` | Your Gemini API key |
| `AI_MODEL` | `gemini-flash-latest` |

`PLAYER_NAME` / `PLAYER_EMAIL` / `PLAYER_PASSWORD` are only used by the seed
script — you do **not** need them on Vercel (the DB is already seeded).

> **Never commit `.env`.** It's already in `.gitignore`. Secrets live only in
> Vercel's dashboard.

### Supabase pooling (important for serverless)
Vercel runs serverless functions that open many short-lived connections. For
production, prefer Supabase's **pooled** connection:
- `DATABASE_URL` → transaction pooler, port **6543**, add `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL` → direct connection, port **5432**

Find both under: Supabase Dashboard → Project → **Connect** → ORMs → Prisma.
(Your current port-5432 URL will also work for light personal use, but 6543 is
safer under load.)

---

## Path A — Vercel CLI (no Git)

```powershell
npm i -g vercel        # install the CLI once
vercel login           # opens the browser to sign in
vercel                 # from D:\Programming\Claude os — creates + deploys a preview
```
The CLI will ask a few questions (scope, project name, "link to existing?" → No,
directory → `./`). It auto-detects Next.js.

Then set env vars and ship to production:
```powershell
# add each variable (it will prompt for the value, choose "Production")
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel env add AI_PROVIDER production
vercel env add AI_API_KEY production
vercel env add AI_MODEL production

vercel --prod          # deploy to your production URL
```

That's it — open the printed URL and log in.

---

## Path B — GitHub + Vercel (auto-deploy on push)

1. Install Git: https://git-scm.com/download/win  (then reopen the terminal).
2. Create the repo and push:
   ```powershell
   git init
   git add .
   git commit -m "ASCEND//SYSTEM"
   git branch -M main
   git remote add origin https://github.com/<you>/ascend-system.git
   git push -u origin main
   ```
   (Confirm `.env` is NOT listed by `git status` — it must stay ignored.)
3. Go to https://vercel.com → **Add New → Project** → import the GitHub repo.
4. Framework preset: **Next.js** (auto). Build command stays `npm run build`
   (it runs `prisma generate` first — already configured).
5. Add the environment variables from the table above → **Deploy**.
6. Every future `git push` auto-deploys.

---

## After deploying

- **Log in** with the email/password you seeded (`harsh@ascend.local`).
- **Change the password** — the seed password is a placeholder. (Change it in
  Settings, or update `PLAYER_PASSWORD` locally and re-run `npm run db:seed`
  against the same DB.)
- **The Guide** will produce live Gemini briefings in production because
  `AI_PROVIDER=gemini` + `AI_API_KEY` are set in Vercel.

## Schema changes later
If you edit `prisma/schema.prisma`, re-sync the database (run locally, it points
at the same Supabase DB):
```powershell
npm run db:push
```
No redeploy is needed for data; redeploy only when you change code.
