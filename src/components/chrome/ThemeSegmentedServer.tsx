/**
 * v1.5 follow-up (D46, reviewer F-N1): the server half of the «المظهر» row on
 * the staff and admin «حسابي» pages. Reads the `theme` cookie, like
 * ThemeToggle, so a stored light/dark choice is pressed on the first paint.
 * With no stored choice (or a v1.5 "system") neither segment is pressed until
 * mount (D50).
 */
import { cookies } from "next/headers";

import { parseTheme, THEME_COOKIE } from "@/lib/theme";

import { ThemeSegmented } from "./ThemeSegmented";

export async function ThemeSegmentedServer() {
  const choice = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return <ThemeSegmented choice={choice} />;
}

export default ThemeSegmentedServer;
