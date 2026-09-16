import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRobotRig } from './robot-rig.js';

export async function mountRobot(host, invalidate) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.16, 2.16, 1.2214, -1.2214, .1, 30);
  camera.position.set(1.80, 3.25, 7);
  camera.lookAt(.05, 1.15, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  scene.environmentIntensity = .7;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xc4dbed, 0x756650, 1.8));
  const key = new THREE.DirectionalLight(0xffe5c5, 3.2);
  key.position.set(-3, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -2, near: .1, far: 16 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .012;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb6e2ff, 2.1); rim.position.set(4, 3, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, .6); fill.position.set(0, 2, 5); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.ShadowMaterial({ opacity: .25 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .002; floor.receiveShadow = true; scene.add(floor);
  let disposed = false;
  function resize() {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const mobile = innerWidth < 800;
    const half = mobile ? 3.5 : 2.16;
    camera.left = -half; camera.right = half;
    camera.top = half * 1520 / 2688; camera.bottom = -camera.top;
    const aim = new THREE.Vector3(mobile ? -.52 : .05, mobile ? 1.45 : 1.15, 0);
    camera.position.copy(aim).add(new THREE.Vector3(1.75, 2.10, 7));
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
        if (m.name.includes('Robot')) { m.roughness = .32; m.envMapIntensity = 1.15; }
        if (m.name.startsWith('Cart') || m.name.startsWith('Bin')) m.color.multiplyScalar(.45);
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
