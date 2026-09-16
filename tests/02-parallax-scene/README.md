# Layered robot hero

The hero uses the supplied factory background, person and foreground PNGs at their shared 2688 × 1520 registration. A transparent Three.js canvas sits above the person and below the foreground. Existing page copy, scroll viewpoints, navigation and dialogs are preserved.

`robot-scene.js` loads `standard-bots-workstation-v2.glb` (179,046 triangles, 4.11 MB). Warm overhead light, cool machine-side fill, environment reflections, soft shadows, emissive tool surfaces and small additive halos integrate it with the photograph. The canvas caps DPR at 1.5 and renders on demand, stopping when settled or offscreen. Phones use a wider camera to fit the assembly. The supplied full-scene reference is a loading/WebGL fallback; it contains the reference robot, rather than the interactive model.

`robot-rig.js` uses the exported J0–J5 hierarchy and local +Y axes. A bounded CCD solver follows an eased cursor target close to the rest pose. The cart and pedestal remain fixed. Presentation limits are deliberately narrow; these are visual controls, not manufacturer-certified machine controls. Cable meshes stay attached to their links; large-motion cable simulation is outside this small hero motion envelope.

The motion toggle and reduced-motion preference return the arm to rest and stop parallax. Touch scrolling does not drive the arm. Mouse exit eases back to rest. WebGL failure retains the photographic composition.

## Development

Run `npm ci`, `npm test`, `npm run build`, then `npm run dev`. Open `http://127.0.0.1:4173/tests/02-parallax-scene/`. Rebuild after source edits. Vercel builds with the same command and publishes only `dist/`.

Tests exercise a 25-position cursor grid, limits, fixed cart/pedestal transforms, tool height, deterministic solving, invalid inputs and return to rest. Browser checks cover desktop and 390 px mobile composition, pointer response, pause/resume and the three viewpoint controls.

Lighting and camera values live in `robot-scene.js`; photograph crop and parallax amplitudes live in `test.js`. The provided cutouts retain some background pixels, so parallax travel is deliberately subtle.
