"use client";

import { useEffect, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { highlight } from "./code";
import { CopyButton } from "./copy";
import { LOOKS, useLooks, type Look } from "./looks";

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
  const { picked, setPicked, full, effect, others } = useLooks();
  const [size, setSize] = useState<{ raw: number; gz: number | null } | null>(null);
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
    setPicked((p: Look[]) => LOOKS.map((l) => l.name).filter((x) => (x === n ? on : p.includes(x))));

  const names = ["distortionWave", ...picked].join(", ");
  const tag = `<script src="${file}"></script>
<script>
  // the file puts everything on window.DistortionWave
  const { ${names} } = DistortionWave

  button.addEventListener('click', (e) => {
    distortionWave(card, () => {
      card.classList.toggle('done')
    }, { ${effect}source: button, focus: e })${others ? `\n    ${others}` : ""}
  })
</script>`;

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
    </div>
  );
}
