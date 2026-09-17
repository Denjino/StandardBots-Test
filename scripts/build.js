import { build } from 'esbuild';
import sharp from 'sharp';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
// Only the generated output directory may be replaced.
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Invalid output directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ['assets', 'shared', 'tests', 'index.html']) {
  await cp(path.join(root, entry), path.join(out, entry), {
    recursive: true,
    filter: source => !/robot-(scene|rig)\.js$|\.test\.js$|\.bundle\.js$/.test(source),
  });
}
await build({
  entryPoints: [path.join(root, 'tests/02-parallax-scene/robot-scene.js')],
  bundle: true, format: 'esm', minify: true, target: ['es2022'],
  outfile: path.join(out, 'tests/02-parallax-scene/robot-scene.bundle.js'),
  logLevel: 'info',
});
// Delivery encoding only: preserve the uploaded panorama and avoid a 10 MB
// reflection-map request on every first visit.
await mkdir(path.join(out, 'assets/env'), { recursive: true });
await sharp(path.join(root, 'assets/img/hf_20260916_221537_c57b80d4-13ba-43d3-8076-baef521c9290.png'))
  .resize({ width: 2048, withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(path.join(out, 'assets/env/factory-reflections-v1.webp'));
