# Layered robot hero

The hero uses the supplied factory background and person PNGs at their shared 2688 × 1520 registration. A transparent Three.js canvas sits above the person. The enlarged foreground is pinned independently to the hero's bottom-right corner and does not parallax. Existing page copy, scroll viewpoints, navigation and dialogs are preserved.

`robot-scene.js` loads `standard-bots-workstation-v2.glb` (179,046 triangles, 4.11 MB). A perspective camera uses a 55 mm lens on a 36 mm film gate, positioned to match the reference's cart angle. Phones move the camera back while retaining that lens. PBR materials use a generated factory reflection environment with ceiling strips, warm walls and a blue machine-side panel. Aluminium blanks use metalness 1, roughness .19 and subtle machining variation. Fine, static shader grain affects only the rendered model. Warm overhead light, soft shadows, emissive tool surfaces and small additive halos complete the scene. The canvas caps DPR at 1.5 and renders on demand, stopping when settled or offscreen. The supplied full-scene reference is a loading/WebGL fallback; it contains the reference robot, rather than the interactive model.

`robot-rig.js` uses the exported J0–J5 hierarchy and local +Y axes. A bounded CCD solver follows an eased cursor target with ±.245 m horizontal and ±.145 m vertical offsets. Left/right input also rotates J0 by up to ±.24 radians (13.75°); the remaining joints solve around that yaw. The cart and pedestal remain fixed. Presentation limits are deliberately narrow; these are visual controls, not manufacturer-certified machine controls. Cable meshes stay attached to their links; large-motion cable simulation is outside this small hero motion envelope.

The motion toggle and reduced-motion preference return the arm to rest and stop parallax. Touch scrolling does not drive the arm. Mouse exit eases back to rest. WebGL failure retains the photographic composition.

## Development

Run `npm ci`, `npm test`, `npm run build`, then `npm run dev`. Open `http://127.0.0.1:4173/tests/02-parallax-scene/`. Rebuild after source edits. Vercel builds with the same command and publishes only `dist/`.

Tests exercise a 25-position cursor grid, limits, fixed cart/pedestal transforms, tool height, deterministic solving, invalid inputs and return to rest. Browser checks cover desktop and 390 px mobile composition, pointer response, pause/resume and the three viewpoint controls.

Lighting and camera values live in `robot-scene.js`; photograph crop and parallax amplitudes live in `test.js`. The provided cutouts retain some background pixels, so parallax travel is deliberately subtle.
