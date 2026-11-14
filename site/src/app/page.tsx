import { Code } from "@/components/code";
import { Toasts } from "@/components/copy";
import { Demos } from "@/components/demos";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { FrameworkTabs, InstallTabs } from "@/components/install";
import { Tuner } from "@/components/tuner";
import { WaveProvider } from "@/components/wave";

const FIRST_CALL = `import { distortionWave } from 'distortion-wave'

button.addEventListener('click', (e) => {
  distortionWave(card, () => {
    card.classList.toggle('done')
  }, { source: button, focus: e })
})`;

export default function Home() {
  return (
    <WaveProvider>
      <header className="top">
        <a className="wordmark" href="#hero-title">
          distortion-wave <span className="version">0.2.1</span>
        </a>
        <nav aria-label="Links">
          <a href="https://www.npmjs.com/package/distortion-wave">npm</a>
          <a href="https://codepen.io/LukyVj/pen/jEBJpLp">CodePen</a>
        </nav>
      </header>

      <main>
        <Hero />

        <section className="section" aria-labelledby="try">
          <div className="section-head">
            <h2 id="try">Try it on real controls</h2>
            <p>
              Each control runs its change inside <code>distortionWave()</code>. The line under it
              says which element waves, and where the wave starts.
            </p>
          </div>
          <Demos />
        </section>

        <section className="section" aria-labelledby="tune">
          <div className="section-head">
            <h2 id="tune">Tune every wave on this page</h2>
            <p>
              These settings go through <code>setWaveDefaults()</code>, so they apply to every call
              that doesn&apos;t set its own. The code panel waves each time you change one.
            </p>
          </div>
          <Tuner />
        </section>

        <section className="section" aria-labelledby="install">
          <div className="section-head">
            <h2 id="install">Install</h2>
            <p>No dependencies. Works with a bundler or straight from a CDN.</p>
          </div>
          <ol className="steps">
            <li>
              <h3>Add the package</h3>
              <InstallTabs />
            </li>
            <li>
              <h3>Pass the element and the change</h3>
              <Code label="A first call">{FIRST_CALL}</Code>
              <p className="step-note">
                <code>source</code> is where the wave leaves from. <code>focus</code> makes the front
                lean toward the touch point. Both are optional.
              </p>
            </li>
          </ol>
        </section>

        <section className="section" aria-labelledby="frameworks">
          <div className="section-head">
            <h2 id="frameworks">In your framework</h2>
            <p>
              The second capture has to see the new DOM, so render before the update returns. Each
              framework has one line for that.
            </p>
          </div>
          <FrameworkTabs />
        </section>

        <section className="section" aria-labelledby="faq">
          <div className="section-head">
            <h2 id="faq">Questions</h2>
          </div>
          <Faq />
        </section>
      </main>

      <footer className="foot">
        <p>
          Inspired by Jakub Antalik&apos;s{" "}
          <a href="https://libraries.dev/waves">Distortion Waves</a> for SwiftUI. This is an
          independent web implementation.
        </p>
        <p>
          MIT licence. Made by <a href="https://codepen.io/LukyVj">LukyVj</a>. Controls built with{" "}
          <a href="https://ui-sdk.dev">ui-sdk</a>.
        </p>
      </footer>
      <Toasts />
    </WaveProvider>
  );
}
