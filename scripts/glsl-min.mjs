// Squeezes the GLSL template literals at build time: comments and indentation out, preprocessor lines kept
// on their own lines, `${…}` interpolations and the /*@FX*/ hook left alone. esbuild never touches the
// inside of a template literal, so without this every shader ships as written.
import { readFile } from 'node:fs/promises';
import { glslNames } from './glsl-names.mjs';

const IS_GLSL = /#version 300 es|void main|precision highp|uniform \w+ \w+/;

function squeeze(text) {
  const lead = /^\s/.test(text), trail = /\s$/.test(text);
  const kept = [];
  let s = text.replace(/\/\*@FX\*\//g, () => `@@${kept.push('/*@FX*/') - 1}@@`)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, '');
  let out = '';
  for (const line of s.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) { out += `${out && !out.endsWith('\n') ? '\n' : ''}${t.replace(/\s+/g, ' ')}\n`; continue; }
    out += (out && !out.endsWith('\n') ? ' ' : '') + t.replace(/\s+/g, ' ').replace(/ ?([{}();,=<>?:*/!&|[\]^%]) ?/g, '$1');
  }
  if (!out) return /\s/.test(text) ? '\n' : '';
  out = out.replace(/@@(\d+)@@/g, (_, i) => `\n${kept[+i]}\n`);
  return (lead && out && !out.startsWith('\n') ? '\n' : '') + out + (trail && out && !out.endsWith('\n') ? '\n' : '');
}

export function minifyGlsl(literal) {
  return literal.split(/(\$\{[^}]*\})/).map((part, i) => (i % 2 ? part : squeeze(part))).join('');
}

export const glslMin = {
  name: 'glsl-min',
  setup(b) {
    const names = glslNames('src');          // one table for every entry: the bundles share names
    b.onLoad({ filter: /src[\\/].*\.js$/ }, async (args) => {
      const src = await readFile(args.path, 'utf8');
      // JS outside the shaders gets its uniform names rewritten; each shader is squeezed, then renamed
      const parts = src.split(/(`(?:[^`\\]|\\.)*`)/s).map((part, i) => {
        if (i % 2 === 0) return names.renameJs(part, args.path);
        const body = part.slice(1, -1);
        return IS_GLSL.test(body) ? `\`${names.renameGlsl(minifyGlsl(body))}\`` : part;
      });
      return { contents: parts.join(''), loader: 'js' };
    });
  },
};
