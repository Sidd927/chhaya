/**
 * Hand-shape reading for Chhaya.
 *
 * Pure functions over 25 WebXR hand joint positions (metres, any frame) so the
 * same code runs in the headset and in the Node tuning script
 * (scripts/tune-shapes.ts), which checks it against IWER's captured poses.
 *
 * Joint order is the WebXR XRHand order: wrist, then four thumb joints, then
 * five joints for each of index, middle, ring and pinky (metacarpal → tip).
 */

export const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const;

export const JOINT_COUNT = 25;

/** First joint index of each finger chain (metacarpal). Thumb has 4 joints. */
export const FINGER_BASE = { thumb: 1, index: 5, middle: 10, ring: 15, pinky: 20 } as const;
export type Finger = keyof typeof FINGER_BASE;

export type Species =
  | 'hare'
  | 'lion'
  | 'stag'
  | 'peacock'
  | 'crocodile'
  | 'tortoise'
  | 'snake'
  | 'wisp';

export interface ShapeReading {
  /** Bend of each finger from metacarpal to tip, radians (0 = straight). */
  curl: Record<Finger, number>;
  /** Angle between index and pinky pointing directions, radians. */
  spread: number;
  /** Thumb tip distance from the index knuckle, in palm widths. */
  thumbReach: number;
  /** Thumb tip to index tip distance in metres. */
  pinchGap: number;
  /** 0 = fist, 1 = fully open (mean straightness of the four fingers). */
  openness: number;
  species: Species | null;
}

type V = [number, number, number];

function at(j: ArrayLike<number>, i: number): V {
  return [j[i * 3], j[i * 3 + 1], j[i * 3 + 2]];
}
function sub(a: V, b: V): V {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function len(a: V): number {
  return Math.hypot(a[0], a[1], a[2]);
}
function angle(a: V, b: V): number {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-6 || lb < 1e-6) return 0;
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return Math.acos(Math.min(1, Math.max(-1, c)));
}

/** Sum of bend angles along a chain of joint indices. */
function chainCurl(j: ArrayLike<number>, chain: number[]): number {
  let total = 0;
  for (let k = 0; k + 2 < chain.length; k++) {
    total += angle(sub(at(j, chain[k + 1]), at(j, chain[k])), sub(at(j, chain[k + 2]), at(j, chain[k + 1])));
  }
  return total;
}

function fingerChain(f: Finger): number[] {
  const b = FINGER_BASE[f];
  return f === 'thumb' ? [b, b + 1, b + 2, b + 3] : [b, b + 1, b + 2, b + 3, b + 4];
}

// Curl thresholds (radians, metacarpal→tip). Tuned against IWER's pose library
// with margin on both sides; see scripts/tune-shapes.ts for the evidence.
const STRAIGHT = 0.9;
const CURLED = 2.5;

export function readShape(j: ArrayLike<number>): ShapeReading {
  const curl = {
    thumb: chainCurl(j, fingerChain('thumb')),
    index: chainCurl(j, fingerChain('index')),
    middle: chainCurl(j, fingerChain('middle')),
    ring: chainCurl(j, fingerChain('ring')),
    pinky: chainCurl(j, fingerChain('pinky')),
  };
  const indexDir = sub(at(j, 9), at(j, 6));
  const pinkyDir = sub(at(j, 24), at(j, 21));
  const spread = angle(indexDir, pinkyDir);
  const palmWidth = Math.max(0.03, len(sub(at(j, 6), at(j, 21))));
  const thumbReach = len(sub(at(j, 4), at(j, 6))) / palmWidth;
  const pinchGap = len(sub(at(j, 4), at(j, 9)));
  const fingers: Finger[] = ['index', 'middle', 'ring', 'pinky'];
  let openSum = 0;
  for (const f of fingers) openSum += 1 - Math.min(1, Math.max(0, (curl[f] - 0.3) / 2.6));
  const openness = openSum / 4;
  const reading: ShapeReading = { curl, spread, thumbReach, pinchGap, openness, species: null };
  reading.species = classify(reading);
  return reading;
}

function classify(r: ShapeReading): Species | null {
  const s = (f: Finger) => r.curl[f] < STRAIGHT;
  const c = (f: Finger) => r.curl[f] > CURLED;
  const mid = (f: Finger) => !s(f) && !c(f);
  const allStraight = s('index') && s('middle') && s('ring') && s('pinky');

  // A pinch is a tool gesture (grab a shadow), never a creature.
  if (r.pinchGap < 0.025) return null;

  if (allStraight) {
    // Spread wide: a peacock fanning its tail. Pressed together with the thumb
    // tucked alongside: a crocodile. A relaxed hand sits between the two
    // (spread ~0.5, thumb out) and deliberately reads as nothing.
    if (r.spread > 0.72) return 'peacock';
    if (r.spread < 0.45 && r.thumbReach < 0.85) return 'crocodile';
    return null;
  }
  if (s('index') && s('middle') && c('ring') && c('pinky')) return 'hare';
  if (s('index') && c('middle') && c('ring') && s('pinky')) return 'stag';
  if (s('index') && c('middle') && c('ring') && c('pinky')) return 'snake';
  if (c('index') && c('middle') && c('ring') && c('pinky')) return 'tortoise';
  if (mid('index') && mid('middle') && mid('ring') && mid('pinky')) return 'lion';
  return null;
}

export const SPECIES_INFO: Record<Species, { name: string; hint: string; gesture: string }> = {
  hare: { name: 'Hare', hint: 'Two fingers up for ears', gesture: 'Index and middle up, others folded' },
  lion: { name: 'Lion', hint: 'Bend every finger into a claw', gesture: 'All fingers half-bent, like a claw' },
  stag: { name: 'Stag', hint: 'Index and little finger up for antlers', gesture: 'Index and little finger up' },
  peacock: { name: 'Peacock', hint: 'Spread your hand wide', gesture: 'All fingers straight and spread' },
  crocodile: { name: 'Crocodile', hint: 'Hold your hand flat, fingers together', gesture: 'Flat hand, fingers together' },
  tortoise: { name: 'Tortoise', hint: 'Make a fist', gesture: 'Closed fist' },
  snake: { name: 'Snake', hint: 'Point one finger', gesture: 'Index finger only' },
  wisp: { name: 'Wisp', hint: 'Any shape, held a little longer', gesture: 'Any other shape' },
};

export const ALL_SPECIES: Species[] = ['hare', 'lion', 'stag', 'peacock', 'crocodile', 'tortoise', 'snake', 'wisp'];
