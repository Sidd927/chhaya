/**
 * Builds src/theater/canonical-shapes.json: one reference silhouette per
 * species, taken from IWER's MIT-licensed hand pose library and flattened to
 * 2D the way a shadow puppeteer would hold it. Used when the lantern summons a
 * creature for you (accessibility assist) and to show "how to make" hints.
 * Run: node scripts/make-canonical-shapes.ts
 */
import { writeFileSync } from 'node:fs';
import { oculusHandConfig } from 'iwer/lib/device/XRHandInput.js';
import { JOINT_NAMES } from '../src/theater/hand-shape.ts';

const PALM = 25;
const ELBOW = 26;

// side: look at the hand's thumb side (profile); palm: palm faces the wall.
const plan: Record<string, { pose: string; view: 'side' | 'palm'; turn: number }> = {
  hare: { pose: 'peace', view: 'palm', turn: -0.25 },
  lion: { pose: 'claw', view: 'side', turn: 0 },
  stag: { pose: 'rock', view: 'palm', turn: 0 },
  peacock: { pose: 'open', view: 'palm', turn: 0 },
  crocodile: { pose: 'flat', view: 'side', turn: 0 },
  tortoise: { pose: 'fist', view: 'side', turn: 0 },
  snake: { pose: 'point', view: 'side', turn: 0.1 },
  wisp: { pose: 'call', view: 'palm', turn: 0 },
};

const out: Record<string, { points: number[]; radii: number[] }> = {};
for (const [species, { pose, view, turn }] of Object.entries(plan)) {
  const jt = (oculusHandConfig.poses as any)[pose].jointTransforms;
  const pts: number[] = [];
  const radii: number[] = [];
  for (const name of JOINT_NAMES) {
    const m = jt[name].offsetMatrix;
    // Wrist frame: -Z along the fingers, +Y out of the back of the hand.
    const [x, y, z] = [m[12], m[13], m[14]];
    let u = view === 'palm' ? x : -z;
    let v = view === 'palm' ? -z : y;
    const c = Math.cos(turn), s = Math.sin(turn);
    [u, v] = [u * c - v * s, u * s + v * c];
    pts.push(+u.toFixed(5), +v.toFixed(5));
    radii.push(+Math.min(0.016, Math.max(0.006, jt[name].radius)).toFixed(4));
  }
  // Palm centre and elbow, as in hands.ts.
  let px = 0, py = 0;
  for (const i of [0, 6, 11, 16, 21, 11]) {
    px += pts[i * 2];
    py += pts[i * 2 + 1];
  }
  pts[PALM * 2] = +(px / 6).toFixed(5);
  pts[PALM * 2 + 1] = +(py / 6).toFixed(5);
  const dx = pts[0] - pts[22], dy = pts[1] - pts[23];
  const l = Math.hypot(dx, dy) || 1;
  pts[ELBOW * 2] = +(pts[0] + (dx / l) * 0.24).toFixed(5);
  pts[ELBOW * 2 + 1] = +(pts[1] + (dy / l) * 0.24).toFixed(5);
  radii.push(0.026, 0.031);
  out[species] = { points: pts, radii };
}
writeFileSync(new URL('../src/theater/canonical-shapes.json', import.meta.url), JSON.stringify(out));
console.log('wrote', Object.keys(out).join(', '));
