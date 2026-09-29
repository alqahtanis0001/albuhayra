"use client";

/**
 * The 6-digit email code field (/verify, /reset). One input, not six boxes:
 * paste, autofill (`one-time-code`) and screen readers all work with no extra
 * code. Arabic-Indic and Persian digits typed on an Arabic keyboard become
 * Western digits as you type, and anything that is not a digit (the space in
 * a pasted "123 456") is dropped. No `maxLength`: the browser would truncate a
 * paste before it is cleaned, so the value is capped here instead.
 */
import { useState } from "react";

import { CODE_LENGTH, toWesternDigits } from "@/lib/validation";

import { Input, type InputProps } from "./Input";

export function normaliseCode(raw: string): string {
  return toWesternDigits(raw).replace(/\D/g, "").slice(0, CODE_LENGTH);
}

type CodeInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange"> & {
  onValueChange?: (code: string) => void;
};

export function CodeInput({ onValueChange, className = "", ...props }: CodeInputProps) {
  const [code, setCode] = useState("");

  return (
    <Input
      {...props}
      value={code}
      onChange={(event) => {
        const next = normaliseCode(event.target.value);
        setCode(next);
        onValueChange?.(next);
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      spellCheck={false}
      dir="ltr"
      className={`text-center font-mono text-2xl tracking-[0.5em] tabular-nums ${className}`}
    />
  );
}

export default CodeInput;
