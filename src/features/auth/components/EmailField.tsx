"use client";

/**
 * The sign-up email field with its typo hint (docs/FRONTEND.md, v1.1e):
 * «هل تقصد name@gmail.com؟» as a button that fills the address in. A hint,
 * never an error — it does not block submit and sets no aria-invalid.
 *
 * Checked on blur, not per keystroke: half-way through typing "gmail.com" the
 * address is "gmail.co", which is on the typo list.
 */
import { useRef, useState } from "react";

import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import { emailTypoSuggestion } from "@/lib/validation";

export function EmailField({
  value,
  onChange,
  error,
  hint = t.signupForm.emailHelp,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [before, after] = t.signupForm.didYouMean.split("{email}");

  return (
    <Input
      ref={input}
      label={t.auth.email}
      name="email"
      type="email"
      inputMode="email"
      autoComplete="email"
      dir="ltr"
      required
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        setSuggestion(null);
      }}
      onBlur={() => setSuggestion(emailTypoSuggestion(value))}
      hint={hint}
      error={error}
    >
      {/* Polite, and always present: the hint appears after focus has moved
          on, so a screen-reader user would otherwise never hear it. */}
      <div aria-live="polite">
        {suggestion ? (
          <button
            type="button"
            onClick={() => {
              onChange(suggestion);
              setSuggestion(null);
              // The button unmounts as it is used; without this, focus
              // would fall to <body>.
              input.current?.focus();
            }}
            className="min-h-11 rounded-lg px-2 text-start text-sm font-medium text-accent-dark underline hover:bg-accent-soft"
          >
            {before}
            <bdi dir="ltr">{suggestion}</bdi>
            {after}
          </button>
        ) : null}
      </div>
    </Input>
  );
}

export default EmailField;
