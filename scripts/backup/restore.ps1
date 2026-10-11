<#
.SYNOPSIS
  Restore a زخم backup (zakham-YYYY-MM-DD-HHMM.dump.enc) into a PostgreSQL database — Windows version.

.DESCRIPTION
  usage (PowerShell):
    .\scripts\backup\restore.ps1 -File C:\path\zakham-2026-10-11-2300.dump.enc -TargetUrl "postgresql://user:pass@host/db?sslmode=require"

  The passphrase is read from $env:BACKUP_PASSPHRASE if set, otherwise prompted.
  Needs on PATH: openssl.exe (ships with Git for Windows: C:\Program Files\Git\usr\bin),
  pg_restore.exe and psql.exe (PostgreSQL 18 installer: C:\Program Files\PostgreSQL\18\bin).
  See docs/BACKUP.md.

  THIS OVERWRITES THE TARGET: every table in the dump is dropped and recreated there.
  Point it at a NEW, EMPTY database unless you really mean to replace.
#>
param(
  [Parameter(Mandatory = $true)] [string] $File,
  [Parameter(Mandatory = $true)] [string] $TargetUrl
)
$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Host "error: $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path -LiteralPath $File)) { Fail "file not found: $File" }
if ($File -notlike "*.dump.enc") { Fail "expected a .dump.enc file" }
if ($TargetUrl -notmatch '^postgres(ql)?://') { Fail "target must be a postgresql:// URL" }
foreach ($tool in @("openssl", "pg_restore", "psql")) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Fail "$tool is not on PATH. openssl: add 'C:\Program Files\Git\usr\bin'; pg_restore/psql: add 'C:\Program Files\PostgreSQL\18\bin'."
  }
}

# 1. Integrity: the sidecar .sha256 written by the workflow, when present.
$shaFile = "$File.sha256"
if (Test-Path -LiteralPath $shaFile) {
  $expected = ((Get-Content -LiteralPath $shaFile -First 1) -split '\s+')[0].ToLower()
  $actual = (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) { Fail "sha256 mismatch - the file is corrupt or not the one the workflow produced.`n  expected $expected`n  actual   $actual" }
  Write-Host "sha256 OK: $actual"
} else {
  Write-Host "note: no .sha256 beside the file; skipping the integrity check."
}

# 2. Where it goes. Show host + database only, never the password.
$m = [regex]::Match($TargetUrl, '^[a-z]+://(?:[^@]*@)?(?<host>[^/?]+)/(?<db>[^?]*)')
if (-not $m.Success -or -not $m.Groups["db"].Value) { Fail "the URL has no database name" }
$dbHost = $m.Groups["host"].Value
$db = $m.Groups["db"].Value

# 3. Version sanity.
$clientMajor = [int]((pg_restore --version).Split(' ')[2].Split('.')[0])
$serverNum = (& psql $TargetUrl -XAtc "SHOW server_version_num" 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $serverNum) { Fail "cannot connect to the target" }
$serverMajor = [math]::Floor([int]$serverNum / 10000)
if ($clientMajor -lt $serverMajor) { Fail "pg_restore $clientMajor is older than the server (Postgres $serverMajor). Install the Postgres $serverMajor client." }

# 4. What is already there.
$existing = (& psql $TargetUrl -XAtc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  RESTORE - THIS OVERWRITES DATA" -ForegroundColor Yellow
Write-Host "  file     : $(Split-Path -Leaf $File)"
Write-Host "  target   : $dbHost / database `"$db`""
Write-Host "  existing : $existing table(s) in the target's public schema"
if ($existing -ne "0") {
  Write-Host ""
  Write-Host "  !! The target is NOT empty. Every table the backup contains will be" -ForegroundColor Red
  Write-Host "  !! dropped and replaced. Rows that exist only in the target are LOST." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""
$answer = Read-Host "Type the database name ($db) to continue, anything else to abort"
if ($answer -cne $db) { Write-Host "aborted."; exit 1 }

# 5. Passphrase (kept in an environment variable so it never appears on a command line).
if (-not $env:BACKUP_PASSPHRASE) {
  $secure = Read-Host "Backup passphrase" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $env:BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if (-not $env:BACKUP_PASSPHRASE) { Fail "empty passphrase" }
}

# 6. Decrypt to a temp file that is removed at the end.
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("zakham-restore-" + [guid]::NewGuid().ToString("N") + ".dump")
try {
  & openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in $File -out $tmp 2>$null
  if ($LASTEXITCODE -ne 0) { Fail "decryption failed - wrong passphrase or damaged file." }
  Write-Host "decrypted: $((Get-Item -LiteralPath $tmp).Length) bytes"

  # 7. Restore. --clean --if-exists drops what the dump will recreate; harmless on an empty DB.
  $sw = [Diagnostics.Stopwatch]::StartNew()
  & pg_restore --no-owner --no-privileges --clean --if-exists --exit-on-error "--dbname=$TargetUrl" $tmp
  if ($LASTEXITCODE -ne 0) { Fail "pg_restore reported errors (exit $LASTEXITCODE). Nothing was skipped silently; read the messages above." }
  Write-Host ("restored in {0}s" -f [int]$sw.Elapsed.TotalSeconds)
}
finally {
  if (Test-Path -LiteralPath $tmp) {
    # Best-effort overwrite before delete so the plaintext does not linger in temp.
    try { $len = (Get-Item -LiteralPath $tmp).Length; $fs = [IO.File]::OpenWrite($tmp); $fs.Write((New-Object byte[] $len), 0, $len); $fs.Close() } catch {}
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

# 8. Show what came back.
Write-Host ""
Write-Host "row counts in `"$db`":"
foreach ($t in @("Establishment", "User", "Transaction", "Party", "Plan", "Instalment", "Employee")) {
  $n = (& psql $TargetUrl -XAtc "SELECT count(*) FROM `"$t`"" 2>$null)
  if ($LASTEXITCODE -ne 0) { $n = "missing" }
  Write-Host ("  {0,-14} {1}" -f $t, $n)
}
Write-Host "done."
