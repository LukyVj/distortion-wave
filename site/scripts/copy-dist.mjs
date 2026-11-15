// Copies the library's <script> builds into public/dist, for the download builder (components/download.tsx).
import { copyFile, mkdir } from 'node:fs/promises';

const FILES = ['distortion-wave', 'electric', 'pixel', 'glass', 'burn', 'ink', 'halftone', 'metal', 'water', 'vine', 'all'];
await mkdir('public/dist', { recursive: true });
await Promise.all(FILES.map((f) => copyFile(`../dist/${f}.iife.min.js`, `public/dist/${f}.iife.min.js`)));
