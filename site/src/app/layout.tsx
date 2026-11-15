import type { Metadata } from "next";
import { Archivo, Fraunces, Instrument_Serif, JetBrains_Mono, Mona_Sans, Unbounded } from "next/font/google";
import "@ui-sdk/core/web.css";
import "./globals.css";
import "./brands.css";

const sans = Mona_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Display faces for the branding tracks (brands.css). Only the chosen one will stay.
const serifItalic = Instrument_Serif({ variable: "--font-piscine", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const condensed = Archivo({ variable: "--font-riso", subsets: ["latin"], axes: ["wdth"] });
const wide = Unbounded({ variable: "--font-chrome", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-journal", subsets: ["latin"], axes: ["opsz", "SOFT", "WONK"] });

export const metadata: Metadata = {
  title: "distortion-wave",
  description:
    "A WebGL2 wave that carries any DOM element from one state to the next. Shaped like document.startViewTransition().",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serifItalic.variable} ${condensed.variable} ${wide.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
