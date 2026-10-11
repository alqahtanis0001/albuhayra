"use client";

/**
 * v1.4 part 3 (D29 R13, D31g): every native date field. Wraps `Input
 * type="date"` with `lang="ar-SA"` (so WebKit renders day-first) and shows the
 * chosen date under it in words — «الأحد 11-10-2026», Gregorian, Western
 * digits — from the pure `dateCaption()`. Works controlled (`value` +
 * `onChange`) and uncontrolled (`defaultValue`; the caption follows the typed
 * value through internal state). Nothing is rendered while the value is not a
 * full date. The Hijri line stays wherever a call site already draws it.
 */
import { useId, useState, type ChangeEvent } from "react";

import { dateCaption } from "@/lib/dates";

import { Input, type InputProps } from "./Input";

export type DateFieldProps = Omit<InputProps, "type">;

export function DateField({ value, defaultValue, onChange, describedBy, ...rest }: DateFieldProps) {
  const captionId = useId();
  const [typed, setTyped] = useState(defaultValue == null ? "" : String(defaultValue));
  const controlled = value !== undefined;
  const current = controlled ? String(value) : typed;
  const caption = dateCaption(current);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setTyped(event.target.value);
    onChange?.(event);
  };

  return (
    <Input
      {...rest}
      type="date"
      lang="ar-SA"
      value={value}
      defaultValue={defaultValue}
      onChange={handleChange}
      describedBy={[describedBy, caption ? captionId : undefined].filter(Boolean).join(" ") || undefined}
    >
      {caption ? (
        <p id={captionId} aria-live="polite" className="text-xs text-gray-600 tabular-nums">
          {caption}
        </p>
      ) : null}
    </Input>
  );
}

export default DateField;
