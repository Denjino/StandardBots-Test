import { MathUtils, Quaternion, Vector3 } from 'three';

// Conservative presentation limits, relative to the modeled rest pose.
// These are intentionally narrower than the provisional mechanical limits.
const RANGE = [.20, .14, .20, .24, .15, .10];
const AXIS = new Vector3(0, 1, 0);
export function createRobotRig(root) {
  const joints = Array.from({ length: 6 }, (_, i) => root.getObjectByName(`J${i}`));
  const tcp = root.getObjectByName('TCP');
  if (!tcp || joints.some(j => !j)) throw new Error('Robot joint hierarchy is incomplete');
  const rest = joints.map(j => j.quaternion.clone());
  const angles = joints.map(() => 0);
  const limits = joints.map((j, i) => [
    Math.max(-RANGE[i], MathUtils.degToRad(j.userData.min_angle_deg ?? -180)),
    Math.min(RANGE[i], MathUtils.degToRad(j.userData.max_angle_deg ?? 180)),
  ]);
  root.updateMatrixWorld(true);
  const origin = tcp.getWorldPosition(new Vector3());
  const target = origin.clone(), p = new Vector3(), end = new Vector3();
  const axis = new Vector3(), a = new Vector3(), b = new Vector3();
  const cross = new Vector3(), q = new Quaternion(), delta = new Quaternion();
  function pose(i, value) {
    angles[i] = MathUtils.clamp(value, ...limits[i]);
    joints[i].quaternion.copy(rest[i]).multiply(delta.setFromAxisAngle(AXIS, angles[i]));
    root.updateMatrixWorld(true);
  }
  function reset() { joints.forEach((_, i) => pose(i, 0)); }
  function track(x, y) {
    x = Number.isFinite(x) ? MathUtils.clamp(x, -1, 1) : 0;
    y = Number.isFinite(y) ? MathUtils.clamp(y, -1, 1) : 0;
    // Solve from rest on each eased input: deterministic, no accumulating drift.
    reset();
    target.copy(origin).add(new Vector3(x * .19, -y * .115, x * .035));
    for (let pass = 0; pass < 9; pass++) {
      for (let i = 4; i >= 0; i--) {
        joints[i].getWorldPosition(p);
        axis.copy(AXIS).applyQuaternion(joints[i].getWorldQuaternion(q));
        a.copy(tcp.getWorldPosition(end)).sub(p).addScaledVector(axis, -end.clone().sub(p).dot(axis));
        b.copy(target).sub(p); b.addScaledVector(axis, -b.dot(axis));
        if (a.lengthSq() < 1e-10 || b.lengthSq() < 1e-10) continue;
        a.normalize(); b.normalize();
        const step = Math.atan2(axis.dot(cross.crossVectors(a, b)), MathUtils.clamp(a.dot(b), -1, 1));
        pose(i, angles[i] + MathUtils.clamp(step, -.07, .07) * .7);
      }
    }
    pose(5, x * .065);
    return tcp.getWorldPosition(end).clone();
  }
  return { track, reset, joints, tcp, angles, limits, origin, target };
}
