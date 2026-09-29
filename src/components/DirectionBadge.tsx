import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

import { Badge } from "./Badge";

/** وارد / صادر. Colour plus the word — never colour alone. */
export function DirectionBadge({ direction }: { direction: DirectionValue }) {
  return (
    <Badge tone={direction === "IN" ? "in" : "out"}>
      {t.direction[direction]}
    </Badge>
  );
}

export default DirectionBadge;
