import { build } from 'esbuild';
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
