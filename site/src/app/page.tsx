import { Toasts } from "@/components/copy";
import { Demos } from "@/components/demos";
import { Effects } from "@/components/effects";
import { Faq } from "@/components/faq";
import { Facts, Hero } from "@/components/hero";
import { Shell } from "@/components/shell";
import { Download } from "@/components/download";
import { FirstCall, FrameworkTabs, InstallTabs } from "@/components/install";
import { LooksProvider } from "@/components/looks";
import { Tuner } from "@/components/tuner";
import { QuickStart } from "@/components/quickstart";
import { GITHUB, GitHubIcon } from "@/components/links";
import { Mark } from "@/components/brand";
import { WaveProvider } from "@/components/wave";

export default function Home() {
  return (
    <WaveProvider>
      <Shell>
        <main>
          <Hero />
          <Facts />

          <section className="section" aria-labelledby="try">
            <div className="section-head" data-eyebrow="Live demos">
              <h2 id="try">Try it on real controls</h2>
              <p>
                Each control runs its change inside <code>distortionWave()</code>. The line under it
                says which element waves, and where the wave starts.
              </p>
            </div>
            <Demos />
          </section>

          <section className="section" aria-labelledby="effects">
            <div className="section-head" data-eyebrow="Looks">
              <h2 id="effects">Other looks, same wave</h2>
              <p>
                An effect keeps the wave&apos;s behaviour and changes its look. Each one is its own import:{" "}
                <code>distortion-wave/electric</code> (about 7 kB, with the border), then{" "}
                <code>pixel</code>, <code>glass</code>, <code>burn</code>, <code>ink</code>,{" "}
                <code>halftone</code>, <code>metal</code>, <code>water</code>,{" "}
                <code>vine</code> and <code>christmas</code> (1 to 3 kB each). To switch
                every demo on this page, pick an effect in the settings below.
              </p>
            </div>
            <Effects />
          </section>

          <section className="section" aria-labelledby="tune">
            <div className="section-head" data-eyebrow="Playground">
              <h2 id="tune">Tune every wave on this page</h2>
              <p>
                Every option of the library, live. They go through <code>setWaveDefaults()</code>, so
                they apply to every call that doesn&apos;t set its own, on this whole page.
              </p>
            </div>
            <Tuner />
          </section>

          <LooksProvider>
            <section className="section" aria-labelledby="install">
              <div className="section-head" data-eyebrow="Install">
                <h2 id="install">Start with your agent</h2>
                <p>
                  Pick your framework and paste the prompt into Claude Code, Cursor or any coding agent. It installs
                  the package, points the agent at the docs and adds the skill, so the first wave comes out right.
                </p>
              </div>
              <QuickStart />

              <div className="by-hand">
                <h3 className="by-hand-title">Or by hand</h3>
                <ol className="steps">
                  <li>
                    <h3>Add the package</h3>
                    <p className="step-note">No dependencies. Works with a bundler or straight from a CDN.</p>
                    <InstallTabs />
                  </li>
                  <li>
                    <h3>Or download one file, with only the looks you use</h3>
                    <p className="step-note">
                      The wave is always in. Each look adds 1 to 1.5 kB gzipped (electric about 6 kB), everything is
                      about 25 kB. With a bundler you don&apos;t need this: import each look from its own entry and
                      only what you import ships.
                    </p>
                    <Download />
                  </li>
                  <li>
                    <h3>Pass the element and the change</h3>
                    <FirstCall />
                    <p className="step-note">
                      The looks ticked above show up in every example from here on. <code>source</code> is where
                      the wave leaves from. <code>focus</code> makes the front lean toward the touch point. Both are
                      optional.
                    </p>
                  </li>
                </ol>
              </div>
            </section>

            <section className="section" aria-labelledby="frameworks">
              <div className="section-head" data-eyebrow="Frameworks">
                <h2 id="frameworks">In your framework</h2>
                <p>
                  The second capture has to see the new DOM, so render before the update returns. Each
                  framework has one line for that.
                </p>
              </div>
              <FrameworkTabs />
            </section>
          </LooksProvider>

          <section className="section" aria-labelledby="faq">
            <div className="section-head" data-eyebrow="FAQ">
              <h2 id="faq">Questions</h2>
            </div>
            <Faq />
          </section>
        </main>

        <footer className="foot">
          <div className="foot-cta">
            <p className="foot-big">
              Give your next state change <em>a material.</em>
            </p>
            <div className="foot-actions">
              <a className="btn btn-primary btn-lg foot-btn" href="#install">Set it up with your agent</a>
              <a className="btn btn-quiet btn-outline btn-lg foot-btn" href={GITHUB}>
                <GitHubIcon /> GitHub
              </a>
            </div>
          </div>
          <div className="foot-grid">
            <div className="foot-sign">
              <Mark size={28} />
              <p>
                Made by <a href="https://lucasbonomi.com">Lucas Bonomi</a> (
                <a href="https://codepen.io/LukyVj">LukyVj</a>) in Paris. MIT licence.
              </p>
            </div>
            <nav className="foot-links" aria-label="Project">
              <a href={GITHUB}>GitHub</a>
              <a href="https://www.npmjs.com/package/distortion-wave">npm</a>
              <a href="/llms.txt">llms.txt</a>
              <a href={`${GITHUB}/blob/main/CHANGELOG.md`}>Changelog</a>
            </nav>
            <p className="foot-credit">
              Inspired by Jakub Antalik&apos;s <a href="https://libraries.dev/waves">Distortion Waves</a> for
              SwiftUI. This is an independent web implementation. Controls built with{" "}
              <a href="https://ui-sdk.dev">ui-sdk</a>.
            </p>
          </div>
        </footer>
        <Toasts />
      </Shell>
    </WaveProvider>
  );
}
