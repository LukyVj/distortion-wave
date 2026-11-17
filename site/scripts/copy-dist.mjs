// Copies the library's <script> builds into public/dist, for the download builder (components/download.tsx),
// and writes public/llms.txt (the docs an agent reads, linked from the Quick Start prompt).
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const FILES = ['distortion-wave', 'electric', 'pixel', 'glass', 'burn', 'ink', 'halftone', 'metal', 'water', 'vine', 'christmas', 'all'];
await mkdir('public/dist', { recursive: true });
await Promise.all(FILES.map((f) => copyFile(`../dist/${f}.iife.min.js`, `public/dist/${f}.iife.min.js`)));

const read = (f) => readFile(new URL(`../../${f}`, import.meta.url), 'utf8');
const strip = (md) => md.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
const parts = [
  ['README.md', 'Package README'],
  ['skill/distortion-wave/SKILL.md', 'Agent skill: rules'],
  ['skill/distortion-wave/references/api.md', 'API reference'],
  ['skill/distortion-wave/references/frameworks.md', 'Frameworks'],
  ['skill/distortion-wave/references/recipes.md', 'Recipes'],
  ['skill/distortion-wave/references/troubleshooting.md', 'Troubleshooting'],
];
const body = await Promise.all(parts.map(async ([f, title]) => `<!-- ${title}: ${f} -->\n\n${strip(await read(f))}`));
await writeFile(
  'public/llms.txt',
  `# distortion-wave\n\n> A WebGL2 wave that carries any DOM element from one state to the next, with an API shaped like document.startViewTransition(). npm: distortion-wave. Source: https://github.com/LukyVj/distortion-wave\n\n${body.join('\n\n---\n\n')}\n`,
);
