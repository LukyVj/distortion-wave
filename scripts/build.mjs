// Builds dist/ (ESM, minified ESM, IIFE for <script> tags) and demo/standalone.html
// (one self-contained file that opens straight from disk, no server needed).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const banner = { js: '/*! distortion-wave · MIT © Lucas Bonomi · https://github.com/LukyVj/distortion-wave */' };
const common = { entryPoints: ['src/index.js'], bundle: true, target: 'es2022', banner, logLevel: 'warning' };

await mkdir('dist', { recursive: true });
await build({ ...common, format: 'esm', outfile: 'dist/distortion-wave.js' });
await build({ ...common, format: 'esm', minify: true, outfile: 'dist/distortion-wave.min.js' });
await build({ ...common, format: 'iife', globalName: 'DistortionWave', minify: true, outfile: 'dist/distortion-wave.iife.min.js' });

// Standalone demo: inline the IIFE build and turn the module import into a destructure.
const html = await readFile('demo/index.html', 'utf8');
const iife = await readFile('dist/distortion-wave.iife.min.js', 'utf8');
const standalone = html
  .replace(/import \{([^}]+)\} from '\.\.\/src\/index\.js';/, 'const {$1} = window.DistortionWave;')
  .replace('<script type="module">', `<script>${iife}</script>\n<script type="module">`);
if (standalone === html) throw new Error('demo import line not found');
await writeFile('demo/standalone.html', standalone);

const sizes = await Promise.all(['dist/distortion-wave.js', 'dist/distortion-wave.min.js', 'dist/distortion-wave.iife.min.js'].map(async (f) => `${f} ${((await readFile(f)).length / 1024).toFixed(1)} kB`));
console.log(sizes.join('\n'));
