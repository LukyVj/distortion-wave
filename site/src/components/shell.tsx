"use client";

import { useRef, useState, type ReactNode } from "react";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { version } from "../../../package.json";
import { origin, useWave } from "./wave";
import { Mark } from "./brand";

export function Shell({ children }: { children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [dark, setDark] = useState(false);
  const wave = useWave();

  return (
    <div ref={page} className="page" data-theme={dark ? "dark" : "light"}>
      <header className="top">
        <a className="wordmark" href="#hero-title">
          <Mark />
          <span className="wordmark-text">
            distortion<span className="wordmark-tilde">∿</span>wave
          </span> <span className="version">{version}</span>
        </a>
        <nav className="top-sections" aria-label="Sections">
          <a href="#try">Demos</a>
          <a href="#effects">Looks</a>
          <a href="#tune">Playground</a>
          <a href="#install">Install</a>
        </nav>
        <nav className="top-links" aria-label="Links">
          <label className="theme">
            <span>Dark</span>
            <Switch
              ref={toggle}
              checked={dark}
              onCheckedChange={(checked) =>
                wave(page, () => setDark(checked), {
                  source: toggle.current,
                  focus: origin("button").focus,
                  palette: checked ? "ocean" : "aurora",
                })
              }
            >
              <SwitchThumb />
            </Switch>
          </label>
          <a className="top-pill" href="https://www.npmjs.com/package/distortion-wave">npm</a>
          <a href="https://codepen.io/LukyVj/pen/jEBJpLp">CodePen</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
