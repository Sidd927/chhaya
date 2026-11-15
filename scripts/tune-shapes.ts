/**
 * Checks the hand-shape classifier against IWER's built-in hand pose library
 * (the same poses the emulator renders). Run: node scripts/tune-shapes.ts
 */
import { oculusHandConfig } from 'iwer/lib/device/XRHandInput.js';
import { JOINT_NAMES, readShape } from '../src/theater/hand-shape.ts';

const expected: Record<string, string | null> = {
  peace: 'hare',
  claw: 'lion',
  rock: 'stag',
  open: 'peacock',
  flat: 'crocodile',
  fist: 'tortoise',
  point: 'snake',
  pinch: null,
  default: null,
};

let failures = 0;
for (const [id, pose] of Object.entries(oculusHandConfig.poses)) {
  const joints = new Float32Array(75);
  JOINT_NAMES.forEach((name, i) => {
    const m = (pose as any).jointTransforms[name].offsetMatrix;
    joints[i * 3] = m[12];
    joints[i * 3 + 1] = m[13];
    joints[i * 3 + 2] = m[14];
  });
  const r = readShape(joints);
  const c = r.curl;
  const want = id in expected ? expected[id] : undefined;
  const ok = want === undefined || want === r.species;
  if (!ok) failures++;
  console.log(
    `${ok ? '  ' : 'XX'} ${id.padEnd(13)} -> ${String(r.species).padEnd(10)} ` +
      `T${c.thumb.toFixed(2)} I${c.index.toFixed(2)} M${c.middle.toFixed(2)} R${c.ring.toFixed(2)} P${c.pinky.toFixed(2)} ` +
      `spread ${r.spread.toFixed(2)} reach ${r.thumbReach.toFixed(2)} gap ${(r.pinchGap * 100).toFixed(1)}cm` +
      (want !== undefined ? `  (want ${want})` : ''),
  );
}
console.log(failures === 0 ? 'ALL EXPECTED SHAPES PASS' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
