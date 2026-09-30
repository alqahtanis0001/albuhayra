"use client";

/**
 * Staff entry form only (Y4): a staff member may still save a plain «رواتب»
 * entry to a موظف party, but it then disappears from every staff view (spec
 * §3.5) — so the form says so while that combination is chosen. Rendered in
 * TransactionForm's `banner` slot (the form itself is frozen at 254 lines); it
 * watches its own form's fields rather than taking state from the form.
 *
 * The party travels in a hidden `partyId` that React updates after the
 * visible select's change event, so the check runs on the next tick.
 *
 * The salary categories come from the server (`salaryCategoryIds`: the
 * profiles' category, the salary plans' categories and anything named
 * «رواتب»), so a renamed salary category still gets the note (Y3).
 */
import { useEffect, useRef, useState } from "react";

import type { PartyOption } from "@/features/parties/queries";
import { t } from "@/i18n/ar";

export function StaffSalaryNote({
  salaryCategoryIds,
  parties,
}: {
  salaryCategoryIds: string[];
  parties: PartyOption[];
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const salary = new Set(salaryCategoryIds);
    const employees = new Set(parties.filter((p) => p.type === "EMPLOYEE").map((p) => p.id));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const data = new FormData(form);
        setShow(salary.has(String(data.get("categoryId") ?? "")) && employees.has(String(data.get("partyId") ?? "")));
      }, 0);
    };
    check();
    // «حفظ وإضافة أخرى» resets the form (a `reset` event) and clears the fields.
    form.addEventListener("change", check);
    form.addEventListener("reset", check);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("change", check);
      form.removeEventListener("reset", check);
    };
  }, [salaryCategoryIds, parties]);

  return (
    <p
      ref={ref}
      role="status"
      className={show ? "rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" : "sr-only"}
    >
      {show ? t.employees.staffHiddenNote : null}
    </p>
  );
}

export default StaffSalaryNote;
