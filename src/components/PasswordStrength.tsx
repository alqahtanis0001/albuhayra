/**
 * The strength meter under a new-password field (docs/FRONTEND.md, v1.1e):
 * three segments plus the word — never colour alone — and, while weak, the
 * first rule the password breaks. The level comes from the shared
 * `passwordStrength()`, so the meter and the server agree on what "weak" is.
 *
 * The text sits in a polite live region that is always in the DOM (a region
 * inserted together with its text is not announced). It changes only when the
 * level or the broken rule changes, not on every keystroke.
 */
import { errorMessage, t } from "@/i18n/ar";

export type StrengthLevel = "weak" | "fair" | "strong";

// Filled segments measure ≥ 3:1 against the white card (non-text contrast);
// the word ≥ 4.5:1: #b91c1c 6.5, amber-800 ≈ 7, #006c35 6.6.
const LEVELS: Record<StrengthLevel, { filled: number; bar: string; text: string; word: string }> = {
  weak: { filled: 1, bar: "bg-money-out", text: "text-money-out", word: t.signupForm.strengthWeak },
  fair: { filled: 2, bar: "bg-amber-700", text: "text-amber-800", word: t.signupForm.strengthFair },
  strong: { filled: 3, bar: "bg-accent", text: "text-accent", word: t.signupForm.strengthStrong },
};

export function PasswordStrength({
  id,
  level,
  reason,
}: {
  id: string;
  /** `null` while the field is empty: grey segments, no text. */
  level: StrengthLevel | null;
  /** The first broken rule as an `err.*` key, shown while weak. */
  reason?: string | null;
}) {
  const look = level ? LEVELS[level] : null;

  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-sm ${look && i < look.filled ? look.bar : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p id={id} aria-live="polite" className="min-h-4 text-xs text-gray-700">
        {look ? (
          <>
            {t.signupForm.strengthLabel}:{" "}
            <span className={`font-semibold ${look.text}`}>{look.word}</span>
            {level === "weak" && reason ? (
              <span className="block text-gray-700">{errorMessage(reason)}</span>
            ) : null}
          </>
        ) : null}
      </p>
    </div>
  );
}

export default PasswordStrength;
