import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRobotRig } from './robot-rig.js';

export async function mountRobot(host, invalidate) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 2688 / 1520, .1, 40);
  camera.filmGauge = 36;
  camera.setFocalLength(55);
  host.dataset.focalLength = '55mm';
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Factory reflection cards: ceiling strips, warm walls and the blue machine.
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.BoxGeometry(12, 9, 14), new THREE.MeshBasicMaterial({ color: 0x55504a, side: THREE.BackSide })));
  function card(color, intensity, size, position, rotation) {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    material.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position); mesh.rotation.set(...rotation); room.add(mesh);
  }
  for (const x of [-3, 0, 3]) card(0xfff2df, 5, [1, 6], [x, 4, 0], [Math.PI / 2, 0, 0]);
  card(0x4c809e, 1.25, [7, 5], [3, 0, -4], [0, -.4, 0]);
  card(0xe3f6ff, 4, [5, .28], [2, 1.8, -3], [0, 0, 0]);
  card(0xe8eef2, 3.5, [6, 1.1], [0, .85, -3.5], [0, 0, 0]);
  card(0xb8a692, 1.2, [4, 5], [-5, 0, 1], [0, Math.PI / 2, 0]);
  const environment = pmrem.fromScene(room, .015);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.15;
  room.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xc4dbed, 0x756650, .65));
  const key = new THREE.DirectionalLight(0xffe5c5, 2.4);
  key.position.set(-3, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -2, near: .1, far: 16 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .012;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb6e2ff, 1.4); rim.position.set(4, 3, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, .35); fill.position.set(0, 2, 5); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.25), new THREE.ShadowMaterial({ opacity: .22 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(.15, .002, .1); floor.receiveShadow = true; scene.add(floor);
  let disposed = false;
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const mobile = innerWidth < 800;
    camera.aspect = width / height; camera.setFocalLength(55);
    const aim = new THREE.Vector3(mobile ? -.42 : .13, mobile ? 1.48 : 1.25, 0);
    camera.position.copy(aim).add(mobile ? new THREE.Vector3(-1.815, 2.475, 9.57) : new THREE.Vector3(-1, 1.3, 5.3));
    camera.lookAt(aim); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function dispose() {
    disposed = true; observer.disconnect();
    scene.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    environment.dispose(); renderer.dispose(); renderer.domElement.remove();
  }
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/models/standard-bots-workstation-v2.glb');
    if (disposed) return null;
    const model = gltf.scene; scene.add(model);
    const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 64;
    const ctx = haloCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,.45)');
    gradient.addColorStop(.25, 'rgba(255,255,255,.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const emitters = [];
    const treated = new Set();
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials) {
        if (treated.has(m)) continue;
        treated.add(m);
        if (m.name.includes('Robot')) { m.roughness = .24; m.metalness = .5; m.envMapIntensity = 1.65; }
        if (m.name.startsWith('Cart')) { m.color.multiplyScalar(.65); m.roughness = .48; m.metalness = .45; }
        if (m.name.startsWith('Bin')) { m.color.multiplyScalar(.65); m.roughness = .7; m.metalness = 0; }
        if (m.name.startsWith('Workpieces')) { m.color.setRGB(.62, .65, .68); m.metalness = 1; m.roughness = .19; m.envMapIntensity = 1.7; }
        if (m.name.startsWith('Hardware')) { m.metalness = 1; m.roughness = .23; }
        if (!m.name.startsWith('LED')) {
          const brushed = m.name.startsWith('Workpieces');
          m.dithering = true;
          m.onBeforeCompile = shader => {
            shader.vertexShader = 'varying vec3 vSurfacePosition;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfacePosition = position;');
            shader.fragmentShader = 'varying vec3 vSurfacePosition;\nfloat surfaceNoise(vec3 p) { return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (surfaceNoise(floor(vSurfacePosition * 1800.0)) - .5) * .055' + (brushed ? ' + sin(vSurfacePosition.y * 9500.0) * .035' : '') + ', .08, 1.0);');
            shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb += (surfaceNoise(vec3(gl_FragCoord.xy, 1.0)) - .5) * .009;');
          };
          m.customProgramCacheKey = () => brushed ? 'factory-brushed-v1' : 'factory-grain-v1';
        }
        if (m.name.includes('green')) { m.emissive.set(0x36ff83); m.emissiveIntensity = 4; m.toneMapped = false; emitters.push([o, 0x42ff98, .095]); }
        if (m.name.includes('white') && m.name.includes('ring')) { m.emissive.set(0xe8ffff); m.emissiveIntensity = 4; m.toneMapped = false; emitters.push([o, 0xe0f8ff, .065]); }
      }
    });
    for (const [mesh, color, size] of emitters) {
      mesh.geometry.computeBoundingBox();
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      mesh.geometry.boundingBox.getCenter(halo.position); halo.scale.setScalar(size); mesh.add(halo);
    }
    const rig = createRobotRig(model);
    // Lamps inherit the wrist transform, so illumination follows the tool.
    const wrist = rig.joints[5];
    const glow = new THREE.PointLight(0x42ffa0, .035, .20, 2); wrist.add(glow);
    const lamp = new THREE.SpotLight(0xecfaff, .8, 1.15, .68, .8, 2);
    lamp.position.set(.07, .03, 0); lamp.target.position.set(.07, .6, 0);
    wrist.add(lamp, lamp.target);
    host.dataset.state = 'ready';
    function render(x = 0, y = 0) {
      if (disposed) return;
      rig.track(x, y);
      renderer.render(scene, camera);
      host.dataset.joints = rig.angles.map(v => v.toFixed(4)).join(',');
      host.dataset.drawCalls = String(renderer.info.render.calls);
    }
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); host.dataset.state = 'fallback';
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { host.dataset.state = 'ready'; invalidate(); });
    invalidate();
    return { render, dispose() { haloTexture.dispose(); dispose(); } };
  } catch (error) { dispose(); throw error; }
}
