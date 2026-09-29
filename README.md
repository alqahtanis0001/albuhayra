# سجل المصروفات — Ledger

A small private web app where business owners in Saudi Arabia record every riyal that comes in or goes out, so they know where each SAR goes. The interface is Arabic and right-to-left.

It is an internal ledger only. There is **no** invoicing, VAT, ZATCA, receipts or bank connection.

**Who uses it**
- **Admin**: one platform account. Approves new owners and can see counts and statuses, but never amounts.
- **Owner**: signs up, waits for admin approval, then gets one establishment. Records entries, sees the dashboard and reports, exports to Excel, locks past months, and manages staff.
- **Staff**: signs up with the owner's join code and waits for the owner's approval. Can always add entries. Can edit only if the owner allows it, and can never delete.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL on [Neon](https://neon.tech) via Prisma · hosted on [Render](https://render.com).

---

## Run it on your computer

You need Node.js 24 and a Neon database.

```bash
npm install
npm approve-scripts --allow-scripts-pending   # lets prisma and esbuild run their install steps
```

Create `.env` **only on a fresh clone**: `cp .env.example .env`, then fill it in. If a `.env` already exists, do not overwrite it, because it holds the real database credentials.

```bash
npx prisma migrate deploy   # creates or updates the tables
npm run seed                # creates the ADMIN account from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (safe to re-run)
npm run build && npm start
```

Open **http://localhost:3000**. Use `localhost`, not the network address `npm start` prints: the login cookie is marked secure, and browsers accept that over plain `http` only for `localhost`. On the network address, login silently sends you back to the login page.

Checks: `npm test` · `npm run typecheck`

---

## Deploy to Render (step by step)

You do this once. Afterwards, every push to the `main` branch on GitHub redeploys automatically.

**What you need**
- A GitHub account that can see this repository.
- A free Render account (sign up with GitHub, which makes step 2 easier).
- Your Neon project open in another tab. You will copy **two** connection strings from it.

### 1. Get the two connection strings from Neon
In the Neon console, open your project and click **Connect**.

1. Turn **Connection pooling ON**, then copy the string. Its host contains `-pooler`. This is your **`DATABASE_URL`**.
2. Turn **Connection pooling OFF**, then copy the string. Its host has **no** `-pooler`. This is your **`DIRECT_URL`**.

Both must end with `sslmode=require`. Keep `channel_binding=require` if Neon includes it.

Why two: the app uses the pooled one because it can serve many requests. The database update step at deploy time uses the direct one, because it cannot work through the pooler.

### 2. Create a session secret
This is a long random password that signs the login cookies. Generate one on your computer:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character result. This is your **`SESSION_SECRET`**. Keep it private. If you ever change it, everyone is signed out, and nothing else is affected.

### 3. Create the service from the Blueprint
1. In Render, click **New +** → **Blueprint**.
2. Connect GitHub if asked, then pick this repository and the `main` branch.
3. Render reads `render.yaml` and shows one **web service** called `ledger` on the **Free** plan. There should be no database in the list, because the database is Neon.
4. Render asks for the values marked secret. Paste:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** string (with `-pooler`) |
   | `DIRECT_URL` | Neon **direct** string (without `-pooler`) |
   | `SESSION_SECRET` | the 64-character value from step 2 |

   Do **not** add `SEED_ADMIN_EMAIL` or `SEED_ADMIN_PASSWORD`. The admin account already exists in Neon.
5. Click **Apply** (Render may label it **Deploy Blueprint**).

The first build takes a few minutes. It installs packages, applies any pending database changes, and builds the app. When the status turns **Live**, Render shows your address, for example `https://ledger-xxxx.onrender.com`. The suffix is added if the name `ledger` is taken.

### 4. Check it
1. Open `https://<your-address>/api/health`. You should see `{"ok":true}`.
2. Open `https://<your-address>` and sign in as the admin, using the same email and password as on your computer. It is the same database.
3. Install the app on a phone (browser menu → *Add to Home Screen*) if you want. This works on the Render address because it uses https.

### What "free" means here
- **The service sleeps after 15 minutes without visitors.** The next visit wakes it. That first page can take **up to about a minute**, showing a blank or loading page. Everything after that is fast again until the next quiet spell.
- Neon's free database also pauses when idle, which adds a moment to that first request.
- No data is lost while sleeping. Everything is stored in Neon, not on Render.
- To remove the wait, change the plan to a paid instance in the Render dashboard. No code change is needed.

### Redeploys and changes
- Push to `main` and Render builds and deploys by itself. Database changes (migrations) are applied during the build.
- To change a secret: Render dashboard → the `ledger` service → **Environment** → edit → **Save**. Render redeploys.
- Backups are handled by **Neon**, not Render. Set the history or retention window in the Neon console.

---

## Later: Google and Microsoft sign-in (v1.1)

This is planned but not built yet (see *v1.1 plan* in `PROGRESS.md`). It needs the Render address from step 3, because Google and Microsoft only send users back to a registered **https** address.

When it is built, you will:
1. In **Google Cloud Console** → APIs & Services → Credentials → your OAuth client → **Authorized redirect URIs**, add the callback address for your Render URL.
2. In **Microsoft Entra admin center** → App registrations → your app → **Authentication** → **Redirect URIs** (platform *Web*), add the Microsoft callback address.
3. In Render → **Environment**, paste the client IDs and secrets the two providers give you.

The exact callback paths and variable names will be written here when v1.1 is built. They will all start with your `https://…onrender.com` address, and `localhost` can stay registered as a second address for testing. If you later move to your own domain, add the new address in both consoles too.

---

## Project files worth knowing
- `CLAUDE.md`: the rules the project is built by.
- `PROGRESS.md`: current state, decisions and known issues.
- `docs/BACKEND.md`, `docs/FRONTEND.md`: the specification.
- `render.yaml`: the Render Blueprint.
