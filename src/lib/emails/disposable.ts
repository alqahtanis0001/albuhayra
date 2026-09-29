import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Throwaway-mail domains (docs/BACKEND.md v1.1e, A12). Server-only: the list
 * has no reason to reach a browser, and the sign-up actions are where it is
 * enforced. Read once, lazily, from `disposable.txt` beside this file (the app
 * runs from the repository root, locally and on Render).
 */

let domains: ReadonlySet<string> | undefined;

function list(): ReadonlySet<string> {
  domains ??= new Set(
    readFileSync(join(process.cwd(), "src/lib/emails/disposable.txt"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line !== "" && !line.startsWith("#")),
  );
  return domains;
}

/** True when the domain or any parent domain is listed (`a.mailinator.com` → `mailinator.com`). */
export function isDisposableEmail(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const labels = domain.split(".");
  const known = list();
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (known.has(labels.slice(i).join("."))) return true;
  }
  return false;
}
