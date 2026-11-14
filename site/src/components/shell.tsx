"use client";

import { useRef, useState, type ReactNode } from "react";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { origin, useWave } from "./wave";

export function Shell({ children }: { children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [dark, setDark] = useState(false);
  const wave = useWave();

  return (
    <div ref={page} className="page" data-theme={dark ? "dark" : "light"}>
      <header className="top">
        <a className="wordmark" href="#hero-title">
          distortion-wave <span className="version">0.2.1</span>
        </a>
        <nav aria-label="Links">
          <label className="theme">
            <span>Dark page</span>
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
          <a href="https://www.npmjs.com/package/distortion-wave">npm</a>
          <a href="https://codepen.io/LukyVj/pen/jEBJpLp">CodePen</a>
        </nav>
      </header>
      {children}
    </div>
  );
}
