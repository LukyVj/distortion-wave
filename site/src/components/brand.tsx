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
} as const;

export type BrandName = keyof typeof BRANDS;

export function useBrand(): BrandName | null {
  const [brand, setBrand] = useState<BrandName | null>(null);
  const { settings, setSettings } = useWaveSettings();

  useEffect(() => {
    const name = new URLSearchParams(window.location.search).get("brand");
    if (name && name in BRANDS) setBrand(name as BrandName);
  }, []);

  useEffect(() => {
    if (!brand) return;
    setSettings({ ...settings, palette: "custom", custom: [...BRANDS[brand].palette] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  return brand;
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
