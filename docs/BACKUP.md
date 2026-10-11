# Database backups — النسخ الاحتياطي لقاعدة البيانات

A GitHub Actions job (`.github/workflows/backup.yml`) copies the whole Neon database every night, encrypts the copy, proves it can be restored, and keeps it for 90 days. It costs nothing and uses no third-party service: only GitHub, the PostgreSQL tools and OpenSSL.

Restore scripts: `scripts/backup/restore.sh` (Linux/macOS) and `scripts/backup/restore.ps1` (Windows).

## ما الذي يُنسخ — What is backed up
- Everything in the Neon database: all 17 tables (establishments, users, categories, transactions, parties, projects, plans, instalments, employees, salaries, attendance, reminder digests, audit log, email codes, month locks) plus Prisma's migration table.
- Taken with `pg_dump --format=custom --no-owner --no-privileges`, so it restores into any Postgres of the same or newer major version, under any database user.
- Not backed up: environment variables (`SESSION_SECRET`, `DATABASE_URL`, the Brevo key, `CRON_SECRET`), the code (that is Git), and anything in Render. Keep those in your password manager.

## متى — When
- Every night at **23:00 UTC = 02:00 Riyadh**, and whenever you press **Run workflow** by hand.
- GitHub pauses scheduled workflows in a repository with **no commits for 60 days**. If the repo goes quiet, the Actions tab shows a yellow "scheduled workflow disabled" notice with an **Enable** button. The quarterly drill below catches this.

## ماذا يحدث في كل تشغيل — What one run does
1. Checks both secrets exist and that the URL is the *direct* one (no `-pooler`).
2. Installs the PostgreSQL 18 client, reads the server's version, and fails if the client is older than the server.
3. `pg_dump` (10-minute limit). Fails if the dump is under 10 KB.
4. Encrypts with `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt`, writes `zakham-YYYY-MM-DD-HHMM.dump.enc` and a `.sha256` beside it, decrypts once to confirm the bytes match, then shreds the plaintext.
5. **Verifies**: decrypts into a throwaway `postgres:18` container on the runner, runs `pg_restore`, then checks: at least 18 tables, every model in `prisma/schema.prisma` present as a table, and row counts of `Establishment`, `Transaction`, `Party`, `Plan` (a count that errors fails the run).
6. Uploads the `.enc` + `.sha256` as a run **artifact, kept 90 days**.
7. Writes the job summary (size, sha256, row counts, duration) and finally greps everything the steps printed: a Postgres connection string or the passphrase in the output fails the run.

The plaintext dump, the connection string and the passphrase never leave the runner. GitHub masks both secrets in logs. The artifact is useless without the passphrase.

## أين تعيش النسخ — Where the copies live
GitHub → the repository → **Actions** (top tab) → workflow **backup** (left list) → click a run → scroll to **Artifacts** at the bottom → `zakham-YYYY-MM-DD-HHMM`. The zip holds the `.dump.enc` and its `.sha256`.

Each run keeps its artifact 90 days, so there are always about 90 nightly copies. Older ones disappear by themselves. Download one every quarter (the drill below) and keep it somewhere outside GitHub too — a USB stick or an encrypted folder.

## كلمة المرور — The passphrase (read this twice)
- Secret name: `BACKUP_PASSPHRASE` in GitHub → repository **Settings → Secrets and variables → Actions**. At least 20 characters; a good one is `openssl rand -base64 32` or a 6-word diceware phrase.
- **GitHub cannot show you a secret once saved.** The only copies are the ones *you* keep. Store it in your password manager **and** on paper in a safe place, labelled "زخم backup passphrase, set on <date>". Without it every backup is random bytes.
- If you ever change it, old artifacts still need the *old* passphrase. Keep every passphrase you ever used, with its date range.
- The other secret, `NEON_DIRECT_URL`, is the direct connection string from the Neon console (**Connect** → untick **Connection pooling** → copy). It looks like `postgresql://…@ep-….aws.neon.tech/neondb?sslmode=require&channel_binding=require` with **no `-pooler`** in the host. Rotate it in Neon whenever a log guard fires.

## تنزيل نسخة — How to download a backup
1. GitHub → **Actions** → **backup** → the run you want (the newest green one is at the top).
2. Scroll to **Artifacts**, click the name. A zip downloads.
3. Unzip it. You get `zakham-YYYY-MM-DD-HHMM.dump.enc` and `….dump.enc.sha256`. Keep them together.

## الاستعادة إلى قاعدة Neon جديدة — Restore to a new Neon database, step by step (Windows laptop)
Restore **into a new, empty database**, test it, and only then point Render at it. Never restore over the live database while the app is running.

**One-time setup on the laptop**
1. Install **PostgreSQL 18** from https://www.postgresql.org/download/windows/ (the EnterpriseDB installer). In the component list you only need **Command Line Tools**; untick the server, pgAdmin and Stack Builder if you like.
2. Install **Git for Windows** if it is not there (it ships `openssl.exe`).
3. Add both to PATH: Start → "Edit the system environment variables" → **Environment Variables** → `Path` → **New** twice:
   `C:\Program Files\PostgreSQL\18\bin` and `C:\Program Files\Git\usr\bin`. Open a **new** PowerShell and check: `pg_restore --version` and `openssl version` both answer.
4. Clone or download this repository so you have `scripts\backup\restore.ps1`.

**The restore**
1. In the Neon console create a **new database** in the project (**Databases → New database**, e.g. `zakham_restore_2026_10_11`) or a whole new project. Open **Connect**, untick **Connection pooling**, copy the direct string, and make sure the database name at the end is the new one.
2. Download the backup (section above) and unzip it to a folder, say `C:\zakham-restore\`.
3. Open PowerShell in the repository folder and run:
   ```powershell
   .\scripts\backup\restore.ps1 -File "C:\zakham-restore\zakham-2026-10-11-2300.dump.enc" -TargetUrl "postgresql://USER:PASSWORD@ep-xxx.aws.neon.tech/zakham_restore_2026_10_11?sslmode=require&channel_binding=require"
   ```
   If PowerShell refuses to run scripts: `Set-ExecutionPolicy -Scope Process Bypass` first, in that window only.
4. The script checks the `.sha256`, connects, shows the host and database name and how many tables already exist there, and **asks you to type the database name** to confirm. Then it asks for the passphrase (typed invisibly). It decrypts to a temp file, runs `pg_restore --clean --if-exists`, deletes the temp file, and prints the row counts.
5. Check the counts against the job summary of the run you downloaded (Actions → the run → the summary at the top). Establishment, Transaction, Party and Plan must match.
6. **Switch the app**: in Render → the `ledger` service → **Environment**, set `DATABASE_URL` to the new database's **pooled** string and `DIRECT_URL` to its **direct** string, save. Render redeploys; `migrate deploy` in the build finds nothing to apply (the backup carries `_prisma_migrations`). Sign in and look at the ledger.
7. Keep the old database untouched for a week before deleting it.

On Linux/macOS the same with `scripts/backup/restore.sh <file.dump.enc> "<direct URL>"`.

## إذا فشل التشغيل — If a run fails
- **GitHub emails the repository owner** when a *scheduled* run fails (the default notification setting: GitHub → your **Settings → Notifications → Actions → "Send notifications for failed workflows only"**; make sure it is on and the email is one you read). A run you start by hand also shows red in the Actions tab.
- Open the run; the failing step is expanded and its last lines say why. The usual causes:
  - *Secret … is not set* → add it under Settings → Secrets and variables → Actions.
  - *looks like the POOLED string* → copy the direct string from Neon (no `-pooler`).
  - *pg_dump … is OLDER than the Neon server* → Neon upgraded Postgres; raise `PG_MAJOR` in `backup.yml` (and the `postgres:` image tag beside it) to the new major, and install that client on your laptop before the next restore.
  - *Dump is only N bytes* / *Only N tables restored* / *Table "X" is missing* → the database is not what we expect. Do not ignore this; look at Neon.
  - *A connection string reached the job output* → rotate the Neon password in the Neon console, update `NEON_DIRECT_URL` and Render's two URLs.
  - Neon's free compute was asleep and the first connect timed out → press **Re-run all jobs**.
- A failed run uploads nothing, so the previous night's artifact is still the latest good copy.
- The schedule itself can be switched off by GitHub after 60 idle days (see *When*).

## تمرين الاستعادة الفصلي — Quarterly restore drill (15 minutes)
Do this every three months and note the date at the bottom of this file.
1. ☐ Actions → **backup** is still scheduled (no "disabled" banner) and the last 7 runs are green.
2. ☐ Open the newest run's summary: row counts look like the real business (not zero, not stale).
3. ☐ Download the newest artifact; confirm the sha256 matches the summary (`Get-FileHash` on Windows, `sha256sum` elsewhere).
4. ☐ Confirm the passphrase is still in the password manager **and** on paper, and that it decrypts: run the restore script against a scratch database (a free Neon branch/database or a local Postgres) and compare the counts.
5. ☐ Delete the scratch database afterwards.
6. ☐ Copy this artifact to your offline store (USB / encrypted folder) and delete the copy older than a year.
7. ☐ Check the GitHub notification email for failed workflows still reaches an inbox you read.

| Drill date | Who | Artifact restored | Result |
|---|---|---|---|
| | | | |
