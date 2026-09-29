/**
 * Auth schemas (v1.1e): sign-up, login, the code screens and reset. Split
 * from `index.ts` by concern (docs/BACKEND.md A14) and re-exported there, so
 * `@/lib/validation` stays the one import path. Client-safe.
 */
import { z } from "zod";

import { normalizeEmail, signupEmail } from "./email";
import { namePart, optionalNamePart, sameName } from "./names";
import { stripInvisibles, toWesternDigits } from "./normalize";
import { newPassword, passwordPersonalError } from "./password";

export const JOIN_CODE_LENGTH = 8;
export const CODE_LENGTH = 6;

/** Login and /forgot: shape only. Their failures never name a rule. */
const email = z
  .string({ error: "err.required" })
  .transform(normalizeEmail)
  .superRefine((value, ctx) => {
    if (value === "") ctx.addIssue({ code: "custom", message: "err.required" });
    else if (value.length > 200) ctx.addIssue({ code: "custom", message: "err.tooLong" });
    else if (!z.email().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "err.emailInvalid" });
    }
  });

/** A password being typed to prove who you are — never judged, only bounded. */
export const enteredPassword = z
  .string({ error: "err.required" })
  .min(1, "err.required")
  .max(200, "err.tooLong");

const establishmentName = z
  .string({ error: "err.required" })
  .trim()
  .min(2, "err.establishmentNameShort")
  .max(80, "err.establishmentNameLong");

export const joinCode = z
  .string({ error: "err.required" })
  .transform((v) => stripInvisibles(v.normalize("NFKC")))
  .pipe(
    z
      .string()
      .trim()
      .toUpperCase()
      .length(JOIN_CODE_LENGTH, "err.joinCodeInvalid")
      .regex(/^[A-Z0-9]+$/, "err.joinCodeInvalid"),
  );

/**
 * Cross-field sign-up rules, each reported on the field the user must change.
 * `when` makes them run even while another field is still invalid, so the form
 * shows every problem at once; values are therefore read defensively.
 */
function signupCrossRules(value: unknown, ctx: z.RefinementCtx): void {
  const record = (value ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  const password = text("password");

  if (text("confirmPassword") !== "" && password !== text("confirmPassword")) {
    ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "err.passwordMismatch" });
  }
  if (sameName(text("firstName"), text("lastName"))) {
    ctx.addIssue({ code: "custom", path: ["lastName"], message: "err.nameFirstLastSame" });
  }
  const personal = passwordPersonalError(password, {
    email: text("email"),
    names: [text("firstName"), text("middleName"), text("lastName")],
  });
  if (password !== "" && personal) {
    ctx.addIssue({ code: "custom", path: ["password"], message: personal });
  }
}

const always = { when: () => true };

const signupFields = {
  firstName: namePart,
  middleName: optionalNamePart,
  lastName: namePart,
  email: signupEmail,
  password: newPassword,
  confirmPassword: z.string({ error: "err.required" }).min(1, "err.required"),
};

/** Owner sign-up. The disposable-domain check is server-only and runs in the action. */
export const SignupOwnerSchema = z
  .object({ ...signupFields, establishmentName })
  .superRefine(signupCrossRules, always);
export type SignupOwnerInput = z.infer<typeof SignupOwnerSchema>;

export const SignupStaffSchema = z
  .object({ ...signupFields, joinCode })
  .superRefine(signupCrossRules, always);
export type SignupStaffInput = z.infer<typeof SignupStaffSchema>;

export const LoginSchema = z.object({
  email,
  password: enteredPassword,
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** A 6-digit code; Arabic-Indic digits and stray spaces are accepted and normalised. */
export const code = z
  .string({ error: "err.codeFormat" })
  .transform((v) => toWesternDigits(stripInvisibles(v)).replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "err.codeFormat"));

export const VerifyCodeSchema = z.object({ code });
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

export const ForgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * `/reset`. Only the account-free rules are here: the email-local-part and name
 * rules need the account, and the action runs them in the order A3 fixes.
 */
export const ResetPasswordSchema = z
  .object({
    code,
    newPassword,
    confirmPassword: z.string({ error: "err.required" }).min(1, "err.required"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "err.passwordMismatch",
  });
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

