export type Vec3 = [number, number, number];

/** A Z-up orbit camera around a target; yaw 0 looks at the model's front from +X. */
export interface Orbit { target: Vec3; distance: number; yaw: number; pitch: number; minDistance: number; maxDistance: number }

const PITCH_LIMIT = 1.45;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Frames a model from its extent; an empty extent gets a sensible default. */
export function orbitFromExtent(min: ArrayLike<number>, max: ArrayLike<number>): Orbit {
  const size = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const radius = size > 0 ? size / 2 : 100;
  const target: Vec3 = size > 0 ? [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] : [0, 0, 50];
  return { target, distance: radius * 2.6, yaw: 0, pitch: 0.35, minDistance: radius * 0.3, maxDistance: radius * 12 };
}

export function cameraPosition(orbit: Orbit): Vec3 {
  const { target: [x, y, z], distance, yaw, pitch } = orbit;
  return [x + distance * Math.cos(pitch) * Math.cos(yaw), y + distance * Math.cos(pitch) * Math.sin(yaw), z + distance * Math.sin(pitch)];
}

export const rotateOrbit = (orbit: Orbit, dx: number, dy: number): Orbit =>
  ({ ...orbit, yaw: orbit.yaw - dx * 0.01, pitch: clamp(orbit.pitch + dy * 0.01, -PITCH_LIMIT, PITCH_LIMIT) });

export const zoomOrbit = (orbit: Orbit, factor: number): Orbit =>
  ({ ...orbit, distance: clamp(orbit.distance * factor, orbit.minDistance, orbit.maxDistance) });

/** Moves the target with the drag, in the camera's screen plane. */
export function panOrbit(orbit: Orbit, dx: number, dy: number): Orbit {
  const scale = orbit.distance * 0.0015;
  const right: Vec3 = [-Math.sin(orbit.yaw), Math.cos(orbit.yaw), 0];
  const up: Vec3 = [-Math.sin(orbit.pitch) * Math.cos(orbit.yaw), -Math.sin(orbit.pitch) * Math.sin(orbit.yaw), Math.cos(orbit.pitch)];
  const target = orbit.target.map((value, axis) => value - right[axis] * dx * scale + up[axis] * dy * scale) as Vec3;
  return { ...orbit, target };
}
