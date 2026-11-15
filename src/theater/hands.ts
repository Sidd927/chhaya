/**
 * Live hand tracking: reads the 25 WebXR joints of each hand every frame and
 * derives what the theater needs: pinch (with hysteresis), stillness, the
 * current hand shape, and a quick "open your hand" gesture.
 */
import { Matrix4, Vector3 } from '@iwsdk/core';
import { JOINT_COUNT, JOINT_NAMES, readShape, type ShapeReading, type Species } from './hand-shape.js';

export type Side = 'left' | 'right';

/** Extra points appended after the 25 joints: palm centre and elbow. */
export const PALM = 25;
export const ELBOW = 26;
export const POINT_COUNT = 27;

/**
 * Bones drawn as shadow capsules: [from, to, radius]. A radius of 0 means
 * "use the tracked joint radii"; otherwise a fixed size in metres.
 * `arm` bones fade away when a shape awakens into a creature.
 */
export const HAND_BONES: ReadonlyArray<readonly [number, number, number, boolean?]> = [
  // thumb
  [0, 2, 0.019], [2, 3, 0], [3, 4, 0],
  // fingers, from the wrist through each knuckle to the tip
  [0, 6, 0.016], [6, 7, 0], [7, 8, 0], [8, 9, 0],
  [0, 11, 0.016], [11, 12, 0], [12, 13, 0], [13, 14, 0],
  [0, 16, 0.015], [16, 17, 0], [17, 18, 0], [18, 19, 0],
  [0, 21, 0.014], [21, 22, 0], [22, 23, 0], [23, 24, 0],
  // palm web
  [6, 21, 0.012], [PALM, 6, 0.026], [PALM, 11, 0.026], [PALM, 16, 0.025], [PALM, 21, 0.022],
  [PALM, 0, 0.03], [PALM, 2, 0.02],
  // forearm
  [0, ELBOW, 0.031, true],
];

const STILL_SPEED = 0.07; // m/s, averaged over wrist and fingertips
const PINCH_START = 0.018;
const PINCH_END = 0.034;
const TIP_INDICES = [0, 4, 9, 14, 19, 24];

export class HandState {
  readonly side: Side;
  /** World positions of 27 points (25 joints + palm + elbow), xyz interleaved. */
  readonly points = new Float32Array(POINT_COUNT * 3);
  readonly radii = new Float32Array(POINT_COUNT);
  tracked = false;
  /** Seconds since tracking was lost (0 while tracked). */
  lostFor = 0;
  pinching = false;
  pinchStarted = false;
  pinchEnded = false;
  readonly pinchPoint = new Vector3();
  speed = 0;
  stillFor = 0;
  reading: ShapeReading | null = null;
  /** The species the hand has held steadily, and for how long. */
  steadySpecies: Species | null = null;
  steadyFor = 0;
  /** True on the frame the hand snaps open from a fist or claw. */
  burst = false;

  private readonly previous = new Float32Array(POINT_COUNT * 3);
  private hasPrevious = false;
  private closedRecently = 0;
  private readonly local = new Float32Array(JOINT_COUNT * 3);

  constructor(side: Side) {
    this.side = side;
    this.radii.fill(0.01);
  }

  point(i: number, out: Vector3): Vector3 {
    return out.set(this.points[i * 3], this.points[i * 3 + 1], this.points[i * 3 + 2]);
  }

  update(frame: XRFrame | null, refSpace: XRReferenceSpace | null, source: XRInputSource | undefined, toWorld: Matrix4, dt: number): void {
    this.pinchStarted = false;
    this.pinchEnded = false;
    this.burst = false;
    const hand = source?.hand;
    let ok = !!(frame && refSpace && hand);
    if (ok) {
      const e = toWorld.elements;
      for (let i = 0; i < JOINT_COUNT; i++) {
        const space = hand!.get(JOINT_NAMES[i] as XRHandJoint);
        const pose = space ? frame!.getJointPose?.(space, refSpace!) : undefined;
        if (!pose) {
          ok = false;
          break;
        }
        const p = pose.transform.position;
        const x = p.x, y = p.y, z = p.z;
        this.points[i * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
        this.points[i * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        this.points[i * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        this.radii[i] = Math.min(0.016, Math.max(0.006, pose.radius ?? 0.009));
        this.local[i * 3] = x;
        this.local[i * 3 + 1] = y;
        this.local[i * 3 + 2] = z;
      }
    }

    if (!ok) {
      if (this.tracked) this.hasPrevious = false;
      this.tracked = false;
      this.lostFor += dt;
      if (this.pinching) {
        this.pinching = false;
        this.pinchEnded = true;
      }
      this.stillFor = 0;
      this.steadyFor = 0;
      this.steadySpecies = null;
      return;
    }
    this.tracked = true;
    this.lostFor = 0;
    this.derivePoints();

    // Speed: wrist and fingertips, smoothed.
    if (this.hasPrevious && dt > 0) {
      let sum = 0;
      for (const i of TIP_INDICES) {
        const dx = this.points[i * 3] - this.previous[i * 3];
        const dy = this.points[i * 3 + 1] - this.previous[i * 3 + 1];
        const dz = this.points[i * 3 + 2] - this.previous[i * 3 + 2];
        sum += Math.hypot(dx, dy, dz);
      }
      const instant = sum / TIP_INDICES.length / dt;
      this.speed += (instant - this.speed) * Math.min(1, dt * 10);
    }
    this.previous.set(this.points);
    this.hasPrevious = true;
    this.stillFor = this.speed < STILL_SPEED ? this.stillFor + dt : 0;

    // Shape.
    this.reading = readShape(this.local);
    const species = this.reading.species;
    if (species !== null && species === this.steadySpecies) this.steadyFor += dt;
    else {
      this.steadySpecies = species;
      this.steadyFor = 0;
    }

    // Pinch with hysteresis.
    const gap = this.reading.pinchGap;
    if (!this.pinching && gap < PINCH_START) {
      this.pinching = true;
      this.pinchStarted = true;
    } else if (this.pinching && gap > PINCH_END) {
      this.pinching = false;
      this.pinchEnded = true;
    }
    this.pinchPoint
      .set(this.points[12], this.points[13], this.points[14])
      .add(this.tmp.set(this.points[27], this.points[28], this.points[29]))
      .multiplyScalar(0.5);

    // "Open burst": the hand was closed in the last half second and is now open.
    const openness = this.reading.openness;
    if (openness < 0.4) this.closedRecently = 0.5;
    else this.closedRecently = Math.max(0, this.closedRecently - dt);
    if (openness > 0.8 && this.closedRecently > 0) {
      this.burst = true;
      this.closedRecently = 0;
    }
  }

  private readonly tmp = new Vector3();
  private readonly tmpB = new Vector3();

  /** Palm centre and an elbow point behind the wrist along the forearm. */
  private derivePoints(): void {
    const p = this.points;
    let x = 0, y = 0, z = 0;
    for (const i of [0, 6, 11, 16, 21, 11]) {
      x += p[i * 3];
      y += p[i * 3 + 1];
      z += p[i * 3 + 2];
    }
    p[PALM * 3] = x / 6;
    p[PALM * 3 + 1] = y / 6;
    p[PALM * 3 + 2] = z / 6;
    this.radii[PALM] = 0.026;

    // Forearm: continue the line from the middle knuckle through the wrist.
    this.point(0, this.tmp);
    this.point(11, this.tmpB);
    this.tmpB.sub(this.tmp).normalize();
    p[ELBOW * 3] = this.tmp.x - this.tmpB.x * 0.24;
    p[ELBOW * 3 + 1] = this.tmp.y - this.tmpB.y * 0.24 - 0.04;
    p[ELBOW * 3 + 2] = this.tmp.z - this.tmpB.z * 0.24;
    this.radii[ELBOW] = 0.031;
  }
}

export class Hands {
  readonly left = new HandState('left');
  readonly right = new HandState('right');
  readonly both: HandState[] = [this.left, this.right];
  private readonly toWorld = new Matrix4();

  update(session: XRSession | undefined, frame: XRFrame | null, refSpace: XRReferenceSpace | null, playerMatrix: Matrix4, dt: number): void {
    let leftSource: XRInputSource | undefined;
    let rightSource: XRInputSource | undefined;
    if (session) {
      for (const source of session.inputSources) {
        if (!source.hand) continue;
        if (source.handedness === 'left') leftSource = source;
        else if (source.handedness === 'right') rightSource = source;
      }
    }
    this.toWorld.copy(playerMatrix);
    this.left.update(frame, refSpace, leftSource, this.toWorld, dt);
    this.right.update(frame, refSpace, rightSource, this.toWorld, dt);
  }

  get anyTracked(): boolean {
    return this.left.tracked || this.right.tracked;
  }
}
