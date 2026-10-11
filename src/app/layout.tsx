import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from "next/font/google";
import { cookies } from "next/headers";

import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { t } from "@/i18n/ar";
import { THEME_COOKIE, htmlThemeAttrs, parseTheme } from "@/lib/theme";
import "./globals.css";

// Bundled at build time — no runtime CDN request (CSP allows 'self' only).
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
});

// The app name as text (footer, print header) — the `font-brand` utility.
// Not preloaded: it is only in the footer and on paper, never above the fold.
const zakham = Reem_Kufi({
  subsets: ["arabic"],
  weight: "700",
  display: "swap",
  variable: "--font-zakham",
  preload: false,
});

export const metadata: Metadata = {
  // Every page's own title gets the app name appended ("<page> — <name>").
  title: { template: `%s — ${t.app.name}`, default: t.app.name },
  description: t.app.tagline,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/brand/zakham-brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/zakham-brand/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/brand/zakham-brand/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  applicationName: t.app.name,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The browser bar: the top bar's green, and its deeper dark-theme band
  // (--color-topbar). The only hexes outside globals.css (token-lint allow-list).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#006c35" },
    { media: "(prefers-color-scheme: dark)", color: "#14532d" },
  ],
};

/**
 * v1.5 (C2, D11): `data-theme` comes from the `theme` cookie, so the server
 * renders the chosen theme and nothing flashes; no cookie = "system" = no
 * attribute, and CSS follows the OS. No inline script (CSP nonce).
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${zakham.variable}`} {...htmlThemeAttrs(theme)}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
