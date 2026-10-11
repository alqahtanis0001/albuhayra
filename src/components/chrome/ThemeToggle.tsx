/**
 * v1.5 (D11, D32): the server half of the theme toggle. Reads the `theme`
 * cookie and renders the client button with that choice, so the icon is right
 * on the first paint. `nav` mounts `<ThemeToggle />` in TopBar.
 */
import { cookies } from "next/headers";

import { parseTheme, THEME_COOKIE } from "@/lib/theme";

import { ThemeToggleButton } from "./ThemeToggleButton";

export async function ThemeToggle() {
  const choice = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return <ThemeToggleButton choice={choice} />;
}

export default ThemeToggle;
