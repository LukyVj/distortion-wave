"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// The looks a visitor picks in the Install section. The download, the first call and the framework snippets all
// follow the same pick, so every example uses what will actually be on the page.
export const LOOKS = [
  { name: "electric", label: "Electric", global: "DistortionWaveElectric" },
  { name: "pixel", label: "Pixel", global: "DistortionWavePixel" },
  { name: "glass", label: "Glass", global: "DistortionWaveGlass" },
  { name: "burn", label: "Burn", global: "DistortionWaveBurn" },
  { name: "ink", label: "Ink", global: "DistortionWaveInk" },
  { name: "halftone", label: "Halftone", global: "DistortionWaveHalftone" },
  { name: "metal", label: "Liquid metal", global: "DistortionWaveMetal" },
  { name: "water", label: "Water", global: "DistortionWaveWater" },
] as const;
export type Look = (typeof LOOKS)[number]["name"];

type Ctx = { picked: Look[]; setPicked: (p: Look[] | ((p: Look[]) => Look[])) => void };
const LooksContext = createContext<Ctx>({ picked: [], setPicked: () => {} });

export function LooksProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<Look[]>([]);
  return <LooksContext.Provider value={{ picked, setPicked }}>{children}</LooksContext.Provider>;
}

export function useLooks() {
  const { picked, setPicked } = useContext(LooksContext);
  const full = picked.length === LOOKS.length;
  return {
    picked,
    setPicked,
    full,
    /** import lines for a bundler: the core, then one entry per look (or the all entry) */
    imports(core = "distortionWave", from = "'distortion-wave'") {
      if (full) return `import { ${core}, ${picked.join(", ")} } from 'distortion-wave/all'`;
      return [`import { ${core} } from ${from}`, ...picked.map((n) => `import { ${n} } from 'distortion-wave/${n}'`)].join("\n");
    },
    /** the effect option, as it goes inside the options object ('' when only the wave is picked) */
    effect: picked.length ? `effect: ${picked[0]}, ` : "",
    /** a comment listing the other picked looks, to swap in */
    others: picked.length > 1 ? `// or effect: ${picked.slice(1).join(", ")}` : "",
  };
}
