"use client";

import { useEffect, useState } from "react";
import { useWaveSettings } from "./wave";

// Branding tracks, picked with ?brand=<name>. Each one sets data-brand on the page
// (tokens, type and hero live in brands.css) and the wave palette that matches.
export const BRANDS = {
  front: { label: "Le front", palette: ["#ff4fd8", "#5b7cff", "#38d9ff"] },
  piscine: { label: "Piscine", palette: ["#38d9ff", "#0b9bbf", "#ffffff"] },
  riso: { label: "Riso", palette: ["#ff48b0", "#0078bf", "#ffe84a"] },
  chrome: { label: "Chrome", palette: ["#8ff7ff", "#3fa9ff", "#ffffff"] },
  journal: { label: "Journal", palette: ["#e4442a", "#141414", "#f4f1ea"] },
  verre: { label: "Verre", palette: ["#5fe3d6", "#0e2a47", "#ffffff"] },
} as const;

export type BrandName = keyof typeof BRANDS;

// Duotone pairs for the Verre track, picked with &duo=<name>.
export const DUOS: Record<string, [string, string, string[]]> = {
  lagune: ["#0e2a47", "#5fe3d6", ["#5fe3d6", "#0e2a47", "#ffffff"]],
  prune: ["#2a1446", "#ff9ecb", ["#ff9ecb", "#2a1446", "#ffffff"]],
  ambre: ["#1f2a1d", "#ffc857", ["#ffc857", "#1f2a1d", "#ffffff"]],
};

export function useBrand(): BrandName | null {
  const [brand, setBrand] = useState<BrandName | null>(null);
  const { settings, setSettings } = useWaveSettings();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const name = q.get("brand");
    if (name && name in BRANDS) setBrand(name as BrandName);
    const duo = q.get("duo") ?? "";
    if (DUOS[duo]) document.querySelector(".page")?.setAttribute("data-duo", duo);
  }, []);

  useEffect(() => {
    if (!brand) return;
    const duo = DUOS[new URLSearchParams(window.location.search).get("duo") ?? ""];
    const palette = brand === "verre" && duo ? duo[2] : [...BRANDS[brand].palette];
    setSettings({ ...settings, palette: "custom", custom: palette as [string, string, string] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  return brand;
}

// Read-only: which track the URL asks for, without touching the wave settings.
export function useBrandName(): BrandName | null {
  const [brand, setBrand] = useState<BrandName | null>(null);
  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("brand");
    if (name && name in BRANDS) setBrand(name as BrandName);
  }, []);
  return brand;
}

// Verre: the mark is a line that becomes a wave. Two states, "before" (both lines flat) and
// "after" (the lower line carried by the wave); CSS shows one or the other, the hero shows both.
export function MarkVerre({ state = "after" }: { state?: "before" | "after" }) {
  return (
    <svg className="mark mark-verre" data-state={state} viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect className="mark-glass" x="1" y="1" width="30" height="30" rx="9" />
      <path className="mark-line" d="M7 12h18" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path
        className="mark-line mark-line-2"
        d={state === "before" ? "M7 20h18" : "M7 20c3-5 5-5 8 0s5 5 10 0"}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// One mark, five dresses: the stroke, the fill and the duplicate are styled per brand in CSS.
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect className="mark-tile" x="1" y="1" width="30" height="30" rx="8" />
      <path
        className="mark-wave mark-wave-2"
        d="M4 19c3-6 6-6 9 0s6 6 9 0 4-6 6-4"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="mark-wave"
        d="M4 17c3-6 6-6 9 0s6 6 9 0 4-6 6-4"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
