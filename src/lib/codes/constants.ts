/**
 * Types and limits of the email-code state machine (docs/BACKEND.md v1.1e
 * "Codes" + A4). Split from `index.ts` only to keep each file readable; both
 * stores and the state machine read these.
 */

export type CodePurpose = "VERIFY" | "RESET";
export type CodeSubject = { userId: string; purpose: CodePurpose };

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_AFTER_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
/** Rolling 24 h caps per user and purpose, counted from EmailCode rows (A4). */
export const MAX_CODES_PER_DAY = 5;
export const MAX_ATTEMPTS_PER_DAY = 10;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** An id no code row can have: keeps the statement count equal on refusals. */
export const NO_CODE = "";

export type CodeError = "err.codeInvalid" | "err.codeExpired" | "err.codeAttempts";
export type CodeCheck = { ok: true; codeId: string } | { ok: false; error: CodeError };
export type IssueResult =
  | { status: "issued"; code: string }
  | { status: "tooSoon" }
  | { status: "capped" };
