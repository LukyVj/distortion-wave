// Renames the GLSL identifiers the shaders declare (functions, variables, parameters, uniforms, varyings, structs) to
// short names, with ONE table computed over every file of src/: electric and pixel are separate bundles that share
// names with the core (fxFront, fxOver, the uniforms…). Uniform names are also rewritten on the JS side, where they
// appear as strings (u('uTime'), 'uPal[0]') and as object keys ({ uTilt: … }, an effect's uniforms()).
// Never renamed: keywords and built-ins (they're never declared), gl_*, anything after a `.` (swizzles, struct
// fields), preprocessor lines, the /*@FX*/ hook and `${…}` interpolations.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TYPES = new Set(['void', 'bool', 'int', 'uint', 'float', 'sampler2D', 'sampler3D', 'samplerCube', 'sampler2DArray',
  ...['vec', 'ivec', 'uvec', 'bvec', 'mat'].flatMap((t) => [2, 3, 4].map((n) => t + n)), 'mat2x3', 'mat2x4', 'mat3x2', 'mat3x4', 'mat4x2', 'mat4x3']);
const KEEP = new Set(['main']);
// GLSL ES 3.00 keywords and reserved words short enough to come out of the generator.
const RESERVED = new Set(['if', 'in', 'do', 'out', 'for', 'int', 'asm', 'enum', 'goto', 'long', 'half', 'this', 'cast', 'using', 'inout', 'flat', 'true', 'else', 'case', 'void', 'uint', 'bool', 'mat2', 'mat3', 'mat4', 'vec2', 'vec3', 'vec4']);
const ID = /(?<![\w.])[A-Za-z_]\w*/g;
const IS_GLSL = /#version 300 es|void main|precision highp|uniform \w+ \w+/;
export { IS_GLSL };

// GLSL text without preprocessor lines and the hook: what the renamer may touch, piece by piece.
const codeParts = (body) => body.split(/(\$\{[^}]*\}|\/\*@FX\*\/|^[ \t]*#[^\n]*$)/m).filter((_, i) => i % 2 === 0);
const glslBodies = (src) => [...src.matchAll(/`((?:[^`\\]|\\.)*)`/gs)].map((m) => m[1]).filter((b) => IS_GLSL.test(b));

function declared(code, out) {
  code = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const structs = [...code.matchAll(/\bstruct\s+(\w+)/g)].map((m) => m[1]);
  structs.forEach((s) => out.add(s));
  code = code.replace(/\bstruct\s+\w+\s*\{[^}]*\}/g, ' ');                   // fields stay as they are
  const isType = (t) => TYPES.has(t) || structs.includes(t) || out.has(t) && /^[A-Z]/.test(t) && code.includes(`struct ${t}`);
  const toks = code.match(/(?<![\w.])[A-Za-z_]\w*|\.\s*\w+|[(),;{}=[\]]/g) || [];
  let depth = 0, decl = -1;                                                  // decl: paren depth of the declaration being read
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], n = toks[i + 1];
    if (t === '(' || t === '[') depth++;
    else if (t === ')' || t === ']') { depth--; if (depth < decl) decl = -1; }
    else if (t === ';' || t === '{' || t === '}') decl = -1;
    else if (t === ',' && depth === decl && n && /^[A-Za-z_]/.test(n) && !isType(n)) out.add(n);
    else if ((TYPES.has(t) || structs.includes(t)) && n && /^[A-Za-z_]/.test(n) && !TYPES.has(n)) { out.add(n); decl = depth; }
  }
}

function buildTable(srcDir) {
  const files = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') && files.push(join(d, e.name))));
  walk(srcDir);
  const decl = new Set(), count = new Map(), seen = new Set();
  const structSrc = [];
  for (const f of files) for (const body of glslBodies(readFileSync(f, 'utf8'))) {
    structSrc.push(body);
    for (const part of codeParts(body)) {
      declared(part, decl);
      for (const [id] of part.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '').matchAll(ID)) { seen.add(id); count.set(id, (count.get(id) || 0) + 1); }
    }
  }
  for (const k of KEEP) decl.delete(k);
  for (const d of [...decl]) if (d.startsWith('gl_') || d.includes('__')) decl.delete(d);
  // words the shaders use but don't declare (built-ins, keywords, FX…) can't be handed out
  const avoid = new Set([...seen].filter((s) => !decl.has(s)));
  const order = [...decl].sort((a, b) => (count.get(b) * b.length - count.get(a) * a.length) || (a < b ? -1 : 1));
  const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', B = A + '0123456789';
  function* names() { for (const a of A) yield a; for (const a of A) for (const b of B) yield a + b; for (const a of A) for (const b of B) for (const c of B) yield a + b + c; }
  const gen = names(), table = new Map();
  for (const o of order) {
    let n; do n = gen.next().value; while (avoid.has(n) || RESERVED.has(n) || TYPES.has(n) || n.startsWith('gl'));
    table.set(o, n);
  }
  return table;
}

export function glslNames(srcDir = 'src') {
  const table = buildTable(srcDir);
  const uniforms = [...table.keys()].filter((k) => /^u[A-Z]/.test(k));
  const renameGlsl = (body) => body.split(/(\$\{[^}]*\}|\/\*@FX\*\/|^[ \t]*#[^\n]*$)/m)
    .map((part, i) => (i % 2 ? part : part.split(/(\bstruct\s+\w+\s*\{[^}]*\})/).map((p, j) => (j % 2
      ? p.replace(/^(struct\s+)(\w+)/, (_, s, n) => s + (table.get(n) ?? n))   // a struct's fields keep their names
      : p.replace(ID, (id) => table.get(id) ?? id))).join(''))).join('');
  // JS side: uniform names as strings and as object keys.
  const renameJs = (js, file) => {
    const out = js
      .replace(/(['"])(u[A-Z]\w*)(\[0\])?\1/g, (m, q, n, idx) => (table.has(n) ? `${q}${table.get(n)}${idx || ''}${q}` : m))
      .replace(/([{,]\s*)(u[A-Z]\w*)(\s*:)/g, (m, a, n, b) => (table.has(n) ? `${a}${table.get(n)}${b}` : m));
    const left = out.match(/\bu[A-Z]\w*\b/g)?.filter((n) => uniforms.includes(n));
    if (left?.length) throw new Error(`glsl-names: ${file} still refers to ${[...new Set(left)].join(', ')} (not a string or an object key)`);
    return out;
  };
  return { table, renameGlsl, renameJs };
}
