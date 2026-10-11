#!/usr/bin/env bash
# Restore a زخم backup (zakham-YYYY-MM-DD-HHMM.dump.enc) into a PostgreSQL database.
#
#   usage:  scripts/backup/restore.sh <file.dump.enc> <target database URL>
#
# The passphrase is read from $BACKUP_PASSPHRASE if set, otherwise prompted
# (never pass it on the command line — it would land in your shell history).
# Needs: openssl, pg_restore (same major version as the server or newer; Neon
# runs Postgres 18), psql. See docs/BACKUP.md.
#
# THIS OVERWRITES THE TARGET: every table in the dump is dropped and recreated
# there. Point it at a NEW, EMPTY database unless you really mean to replace.
set -euo pipefail

usage() { echo "usage: $0 <file.dump.enc> <postgresql://...target URL>" >&2; exit 2; }
[ $# -eq 2 ] || usage
enc="$1"; target="$2"

[ -f "$enc" ] || { echo "error: file not found: $enc" >&2; exit 1; }
case "$enc" in *.dump.enc) ;; *) echo "error: expected a .dump.enc file" >&2; exit 1 ;; esac
case "$target" in postgres://*|postgresql://*) ;; *) echo "error: target must be a postgresql:// URL" >&2; exit 1 ;; esac
for tool in openssl pg_restore psql; do
  command -v "$tool" >/dev/null || { echo "error: $tool is not installed or not on PATH" >&2; exit 1; }
done

# 1. Integrity: the sidecar .sha256 written by the workflow, when present.
if [ -f "$enc.sha256" ]; then
  expected="$(cut -d' ' -f1 "$enc.sha256")"
  if command -v sha256sum >/dev/null; then actual="$(sha256sum "$enc" | cut -d' ' -f1)"; else actual="$(shasum -a 256 "$enc" | cut -d' ' -f1)"; fi
  if [ "$expected" != "$actual" ]; then
    echo "error: sha256 mismatch — the file is corrupt or not the one the workflow produced." >&2
    echo "  expected $expected" >&2
    echo "  actual   $actual" >&2
    exit 1
  fi
  echo "sha256 OK: $actual"
else
  echo "note: no $(basename "$enc").sha256 beside the file; skipping the integrity check."
fi

# 2. Where it goes. Show host + database only, never the password.
host="$(printf '%s' "$target" | sed -E 's#^[a-z]+://([^@]*@)?([^/?]+).*#\2#')"
db="$(printf '%s' "$target" | sed -E 's#^[a-z]+://[^/]+/([^?]*).*#\1#')"
[ -n "$db" ] || { echo "error: the URL has no database name" >&2; exit 1; }

# 3. Version sanity.
client_major="$(pg_restore --version | awk '{print $3}' | cut -d. -f1)"
server_num="$(psql "$target" -XAtc "SHOW server_version_num")" || { echo "error: cannot connect to the target" >&2; exit 1; }
server_major=$(( server_num / 10000 ))
if [ "$client_major" -lt "$server_major" ]; then
  echo "error: pg_restore $client_major is older than the server (Postgres $server_major). Install the Postgres $server_major client." >&2
  exit 1
fi

# 4. What is already there.
existing="$(psql "$target" -XAtc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"

echo
echo "============================================================"
echo "  RESTORE — THIS OVERWRITES DATA"
echo "  file     : $(basename "$enc")"
echo "  target   : $host / database \"$db\""
echo "  existing : $existing table(s) in the target's public schema"
if [ "$existing" != "0" ]; then
  echo
  echo "  !! The target is NOT empty. Every table the backup contains will be"
  echo "  !! dropped and replaced. Rows that exist only in the target are LOST."
fi
echo "============================================================"
echo
printf 'Type the database name (%s) to continue, anything else to abort: ' "$db"
read -r answer
[ "$answer" = "$db" ] || { echo "aborted."; exit 1; }

# 5. Passphrase.
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  printf 'Backup passphrase: '
  read -rs BACKUP_PASSPHRASE; echo
  [ -n "$BACKUP_PASSPHRASE" ] || { echo "error: empty passphrase" >&2; exit 1; }
fi
export BACKUP_PASSPHRASE

# 6. Decrypt to a private temp file that is removed on exit.
tmp="$(mktemp -t zakham-restore.XXXXXX)"
chmod 600 "$tmp"
trap 'shred -u "$tmp" 2>/dev/null || rm -f "$tmp"' EXIT
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in "$enc" -out "$tmp" 2>/dev/null; then
  echo "error: decryption failed — wrong passphrase or damaged file." >&2
  exit 1
fi
echo "decrypted: $(wc -c < "$tmp" | tr -d ' ') bytes"

# 7. Restore. --clean --if-exists drops what the dump will recreate; harmless on an empty DB.
start=$(date +%s)
pg_restore --no-owner --no-privileges --clean --if-exists --exit-on-error --dbname="$target" "$tmp"
echo "restored in $(( $(date +%s) - start ))s"

# 8. Show what came back.
echo
echo "row counts in \"$db\":"
for t in Establishment User Transaction Party Plan Instalment Employee; do
  n="$(psql "$target" -XAtc "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "missing")"
  printf '  %-14s %s\n' "$t" "$n"
done
echo "done."
