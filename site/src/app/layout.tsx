import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Mona_Sans } from "next/font/google";
import "@ui-sdk/core/web.css";
import "./globals.css";

const sans = Mona_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

export const metadata: Metadata = {
  title: "distortion-wave",
  description:
    "A WebGL2 wave that carries any DOM element from one state to the next. Shaped like document.startViewTransition().",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
