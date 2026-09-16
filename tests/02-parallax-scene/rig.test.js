import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { createRobotRig } from './robot-rig.js';
const bytes = await readFile(new URL('../../assets/models/standard-bots-workstation-v2.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const root = gltf.scene;
const rig = createRobotRig(root);
test('cursor targets improve tool distance within all six limits, without moving cart/base', () => {
  const cart = root.getObjectByName('Cart_Root');
  const pedestal = root.getObjectByName('Pedestal_Root');
  const cartRest = cart.matrixWorld.clone(), baseRest = pedestal.matrixWorld.clone();
  for (const x of [-1, -.5, 0, .5, 1]) for (const y of [-1, -.5, 0, .5, 1]) {
    const end = rig.track(x, y);
    assert.ok(end.toArray().every(Number.isFinite));
    if (x || y) assert.ok(end.distanceTo(rig.target) < rig.origin.distanceTo(rig.target), `tracking ${x},${y}`);
    rig.angles.forEach((v,i) => assert.ok(v >= rig.limits[i][0] && v <= rig.limits[i][1]));
    assert.deepEqual(cart.matrixWorld.elements, cartRest.elements);
    assert.deepEqual(pedestal.matrixWorld.elements, baseRest.elements);
    assert.ok(end.y > .98, 'tool clears the cart tray');
  }
});
test('tracking is deterministic and returns to rest without drift', () => {
  const first = rig.track(.75,-.6);
  rig.track(-1,1);
  assert.ok(first.distanceTo(rig.track(.75,-.6)) < 1e-9);
  rig.track(0,0);
  assert.ok(rig.tcp.getWorldPosition(new Vector3()).distanceTo(rig.origin) < 1e-9);
  rig.track(NaN, Infinity);
  assert.ok(rig.angles.every(Number.isFinite));
});
