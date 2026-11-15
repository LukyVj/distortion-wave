"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { highlight } from "./code";
import { CopyButton } from "./copy";

// The looks, as their entry name and the global their <script> build sets.
const LOOKS = [
  { name: "electric", label: "Electric", global: "DistortionWaveElectric" },
  { name: "pixel", label: "Pixel", global: "DistortionWavePixel" },
  { name: "glass", label: "Glass", global: "DistortionWaveGlass" },
  { name: "burn", label: "Burn", global: "DistortionWaveBurn" },
  { name: "ink", label: "Ink", global: "DistortionWaveInk" },
  { name: "halftone", label: "Halftone", global: "DistortionWaveHalftone" },
  { name: "metal", label: "Liquid metal", global: "DistortionWaveMetal" },
  { name: "water", label: "Water", global: "DistortionWaveWater" },
] as const;
type Look = (typeof LOOKS)[number]["name"];

const load = (f: string) => fetch(`/dist/${f}.iife.min.js`).then((r) => r.text());
const BANNER = /^\/\*![^\n]*\*\/\n/;

/** One file: the core, then each look; everything ends up on window.DistortionWave. */
async function bundle(picked: Look[]) {
  if (picked.length === LOOKS.length) return load("all");     // the full build: shared code only once
  const [core, ...fx] = await Promise.all([load("distortion-wave"), ...picked.map(load)]);
  const globals = LOOKS.filter((l) => picked.includes(l.name)).map((l) => l.global);
  const tail = globals.length ? `Object.assign(DistortionWave, ${globals.join(", ")});\n` : "";
  return [core, ...fx.map((s) => s.replace(BANNER, ""))].join("") + tail;
}

async function gzipped(text: string) {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;

export function Download() {
  const [picked, setPicked] = useState<Look[]>(["burn"]);
  const [size, setSize] = useState<{ raw: number; gz: number | null } | null>(null);
  const full = picked.length === LOOKS.length;
  const file = full ? "distortion-wave.all.min.js" : picked.length ? `distortion-wave.${picked.join("-")}.min.js` : "distortion-wave.min.js";

  useEffect(() => {
    let live = true;
    bundle(picked).then(async (text) => {
      const gz = await gzipped(text);
      if (live) setSize({ raw: text.length, gz });
    });
    return () => {
      live = false;
    };
  }, [picked]);

  async function save() {
    const url = URL.createObjectURL(new Blob([await bundle(picked)], { type: "text/javascript" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: file });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const toggle = (n: Look, on: boolean) =>
    setPicked((p) => LOOKS.map((l) => l.name).filter((x) => (x === n ? on : p.includes(x))));

  const example = picked[0] ?? null;
  const npm = useMemo(
    () =>
      full
        ? `// everything in one import\nimport { distortionWave, ${LOOKS.map((l) => l.name).join(", ")} } from 'distortion-wave/all'`
        : [
            "import { distortionWave } from 'distortion-wave'",
            ...picked.map((n) => `import { ${n} } from 'distortion-wave/${n}'`),
          ].join("\n"),
    [picked, full],
  );
  const tag = `<script src="${file}"></script>\n<script>\n  const { distortionWave${example ? `, ${example}` : ""} } = DistortionWave\n  distortionWave(card, update${example ? `, { effect: ${example} }` : ""})\n</script>`;

  return (
    <div className="download">
      <div className="download-picks">
        <label className="download-pick" data-core>
          <Checkbox checked disabled>
            <CheckboxIndicator />
          </Checkbox>
          Wave (core)
        </label>
        {LOOKS.map((l) => (
          <label key={l.name} className="download-pick">
            <Checkbox checked={picked.includes(l.name)} onCheckedChange={(c) => toggle(l.name, c === true)}>
              <CheckboxIndicator />
            </Checkbox>
            {l.label}
          </label>
        ))}
      </div>
      <div className="download-bar">
        <Button className="btn btn-quiet" onClick={() => setPicked(full ? [] : LOOKS.map((l) => l.name))}>
          {full ? "Core only" : "Everything"}
        </Button>
        <Button className="btn btn-primary" onClick={save}>
          Download
        </Button>
        <p>
          <code>{file}</code>
          {size && (
            <span>
              {" "}
              {kb(size.raw)}
              {size.gz != null && <>, about {kb(size.gz)} gzipped</>}
            </span>
          )}
        </p>
      </div>
      <div className="code-panel">
        <pre>
          <code>{highlight(tag)}</code>
        </pre>
        <CopyButton text={tag} />
      </div>
      <div className="code-panel">
        <pre>
          <code>{highlight(npm)}</code>
        </pre>
        <CopyButton text={npm} />
      </div>
    </div>
  );
}
