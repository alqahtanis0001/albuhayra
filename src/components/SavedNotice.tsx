"use client";

/**
 * v1.4 part 3 (D29 R4, D31b): the «تم حفظ الحركة» toast on the page a save
 * lands on. The page reads `?saved=1` (server) and passes `saved`; on mount
 * the parameter is dropped with `history.replaceState` — the rest of the query
 * (ledger filters) stays — so a reload or a shared link does not replay it.
 * Reads nothing but the one parameter.
 */
import { useEffect, useState } from "react";

import { t } from "@/i18n/ar";

import { withoutSaved } from "./savedParam";
import { Toast } from "./Toast";

// D32 S2: the client form imports `withSaved` from here; server pages use `./savedParam` directly (a
// "use client" module's exports become client references on the server).
export { withSaved } from "./savedParam";

export function SavedNotice({ saved }: { saved: boolean }) {
  const [shown, setShown] = useState(saved);

  useEffect(() => {
    if (!saved) return;
    const { pathname, search, hash } = window.location;
    window.history.replaceState(null, "", `${pathname}${withoutSaved(search)}${hash}`);
  }, [saved]);

  if (!saved || !shown) return null;
  return <Toast message={t.transaction.saved} tone="success" onDismiss={() => setShown(false)} />;
}

export default SavedNotice;
