// Self-hosted variable fonts for the /book pages (latin subset).
//
// Why not next/font/google: it downloads fonts from fonts.googleapis.com at
// BUILD time — inside Docker/CI builds without (unrestricted) egress that
// fetch fails and `next build` crashes with
//   TypeError: Cannot read properties of null (reading '1')
// in @next/font/dist/google/loader.js. next/font/local embeds the files at
// build time with zero network access.
//
// Files are the latin variable subsets from Google Fonts (full weight ranges).
import localFont from "next/font/local";

// Shared by src/app/book/page.tsx, src/app/book/[token]/page.tsx and
// src/app/book/manage/[manageToken]/page.tsx — keep the CSS variables
// (--font-display / --font-body) identical to the previous google exports.
export const displayFont = localFont({
  src: "../../fonts/BricolageGrotesque-Variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-display",
});

export const bodyFont = localFont({
  src: "../../fonts/HankenGrotesque-Variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-body",
});
