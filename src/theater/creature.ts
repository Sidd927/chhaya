/**
 * A shadow creature: a frozen copy of the shadow your hand cast at the moment
 * it awoke, animated in 2D on the stage. Every creature keeps the exact
 * silhouette of the hand that made it; species only decides how it moves.
 */
import type { Species } from './hand-shape.js';
import { HAND_BONES, PALM, POINT_COUNT } from './hands.js';
import { CapsuleKind, type ShadowLayer } from './shadow-layer.js';

export type CreatureState = 'awakening' | 'idle' | 'walking' | 'carried' | 'falling' | 'leaving' | 'leaping' | 'gone';

const TARGET_HEIGHT: Record<Species, number> = {
  hare: 0.38,
  lion: 0.5,
  stag: 0.52,
  peacock: 0.5,
  crocodile: 0.3,
  tortoise: 0.25,
  snake: 0.22,
  wisp: 0.32,
};
const TARGET_WIDTH = 0.66;

const SPEED: Record<Species, number> = {
  hare: 0.22,
  lion: 0.11,
  stag: 0.15,
  peacock: 0.07,
  crocodile: 0.06,
  tortoise: 0.028,
  snake: 0.09,
  wisp: 0.06,
};

/** Finger chains as [pivot, ...points]. */
const CHAINS = {
  thumb: [2, 3, 4],
  index: [6, 7, 8, 9],
  middle: [11, 12, 13, 14],
  ring: [16, 17, 18, 19],
  pinky: [21, 22, 23, 24],
} as const;

const AWAKEN_TIME = 1.3;

let nextId = 1;

export interface Ground {
  y: number;
  minX: number;
  maxX: number;
  /** Stage scale: 1 for a 1.3 m tall stage. Sizes and speeds multiply by it. */
  unit: number;
}

export class Creature {
  readonly id = nextId++;
  readonly species: Species;
  state: CreatureState = 'awakening';
  /** Stage position of the creature's feet (bottom centre). */
  x = 0;
  y = 0;
  facing = 1;
  scale = 1;
  age = 0;
  /** Set by the director while a pinch carries this creature. */
  carryX = 0;
  /** During a tale creatures keep near their marks instead of roaming the stage. */
  calm = false;
  carryY = 0;

  private readonly rest = new Float32Array(POINT_COUNT * 2);
  private readonly work = new Float32Array(POINT_COUNT * 2);
  private readonly boneRadii: Float32Array;
  private readonly depth: number;
  private readonly targetScale: number;
  private unit = 1;
  private readonly startX: number;
  private readonly startY: number;
  private vy = 0;
  private walkTo = 0;
  private stateTime = 0;
  private idleFor = 1;
  private phase = Math.random() * 10;
  private roarTime = -1;
  private nudgeTime = -1;
  private blinkIn = 2 + Math.random() * 3;
  private leapFrom = [0, 0];
  private leapTo = [0, 0];
  private leaveDir = 1;
  private fade = 1;
  /** Bottom centre of the shape at capture, in stage metres. */
  private readonly height: number;
  private readonly width: number;
  private eyeLocal = [0, 0];

  /**
   * @param points 27 stage-space points (x, y) of the projected hand.
   * @param radii projected radius for every bone in HAND_BONES.
   */
  constructor(species: Species, points: Float32Array, radii: Float32Array, depth: number, ground: Ground) {
    this.species = species;
    this.depth = depth;
    this.unit = ground.unit;
    this.boneRadii = new Float32Array(radii);

    // Bounding box of the hand without its forearm.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    HAND_BONES.forEach(([a, b, , arm], k) => {
      if (arm) return;
      const r = radii[k];
      for (const i of [a, b]) {
        minX = Math.min(minX, points[i * 2] - r);
        maxX = Math.max(maxX, points[i * 2] + r);
        minY = Math.min(minY, points[i * 2 + 1] - r);
        maxY = Math.max(maxY, points[i * 2 + 1] + r);
      }
    });
    const cx = (minX + maxX) / 2;
    this.width = Math.max(0.01, maxX - minX);
    this.height = Math.max(0.01, maxY - minY);
    for (let i = 0; i < POINT_COUNT; i++) {
      this.rest[i * 2] = points[i * 2] - cx;
      this.rest[i * 2 + 1] = points[i * 2 + 1] - minY;
    }
    this.targetScale = Math.min(
      1.4,
      Math.max(0.15, Math.min((TARGET_HEIGHT[species] * ground.unit) / this.height, (TARGET_WIDTH * ground.unit) / this.width)),
    );
    this.startX = cx;
    this.startY = minY;
    this.x = cx;
    this.y = minY;
    this.walkTo = this.clampX(cx, ground);
    this.eyeLocal = [
      this.rest[PALM * 2] * 0.3 + this.rest[6 * 2] * 0.7,
      this.rest[PALM * 2 + 1] * 0.3 + this.rest[6 * 2 + 1] * 0.7,
    ];
  }

  get alive(): boolean {
    return this.state !== 'gone';
  }

  /** Approximate half-extents on stage, for picking and contact. */
  get halfWidth(): number {
    return (this.width * this.scale) / 2;
  }
  get fullHeight(): number {
    return this.height * this.scale;
  }
  get centerY(): number {
    return this.y + this.fullHeight / 2;
  }

  private clampX(x: number, g: Ground): number {
    return Math.min(g.maxX - 0.15 * g.unit, Math.max(g.minX + 0.15 * g.unit, x));
  }

  private setState(s: CreatureState): void {
    this.state = s;
    this.stateTime = 0;
  }

  goTo(x: number, ground: Ground): void {
    if (this.state === 'gone' || this.state === 'leaping') return;
    this.walkTo = this.clampX(x, ground);
    if (this.state !== 'awakening' && this.state !== 'carried' && this.state !== 'falling') this.setState('walking');
  }

  roar(): void {
    this.roarTime = 0;
  }

  nudge(): void {
    if (this.nudgeTime < 0 || this.nudgeTime > 0.8) this.nudgeTime = 0;
  }

  leave(direction: number): void {
    if (this.state === 'gone') return;
    this.leaveDir = direction >= 0 ? 1 : -1;
    this.setState('leaving');
  }

  leap(toX: number, toY: number): void {
    this.leapFrom = [this.x, this.y];
    this.leapTo = [toX, toY];
    this.setState('leaping');
  }

  pickUp(): void {
    if (this.state === 'awakening' || this.state === 'gone' || this.state === 'leaping') return;
    this.setState('carried');
  }

  drop(): void {
    if (this.state !== 'carried') return;
    this.vy = 0;
    this.setState('falling');
  }

  get canBeCarried(): boolean {
    return this.state === 'idle' || this.state === 'walking' || this.state === 'falling';
  }

  update(dt: number, ground: Ground): void {
    this.age += dt;
    this.stateTime += dt;
    this.phase += dt;
    if (this.roarTime >= 0) this.roarTime += dt;
    if (this.roarTime > 1.1) this.roarTime = -1;
    if (this.nudgeTime >= 0) this.nudgeTime += dt;
    if (this.nudgeTime > 0.6) this.nudgeTime = -1;

    switch (this.state) {
      case 'awakening': {
        const t = Math.min(1, this.stateTime / AWAKEN_TIME);
        const e = t * t * (3 - 2 * t);
        this.scale = 1 + (this.targetScale - 1) * e;
        const landX = this.clampX(this.startX, ground);
        this.x = this.startX + (landX - this.startX) * e;
        // Rise a little, then settle onto the ground.
        this.y = this.startY + (ground.y - this.startY) * e + Math.sin(Math.PI * t) * 0.08 * this.unit;
        if (t >= 1) {
          this.walkTo = this.x;
          this.setState('idle');
          this.idleFor = 0.6;
        }
        break;
      }
      case 'idle':
        this.y = ground.y;
        this.idleFor -= dt;
        if (this.idleFor <= 0 && this.species !== 'wisp') {
          const span = this.calm ? 0.35 * this.unit : (ground.maxX - ground.minX) * 0.6;
          const target = this.x + (Math.random() - 0.5) * span;
          this.goTo(target, ground);
        } else if (this.idleFor <= 0) {
          this.goTo(this.x + (Math.random() - 0.5) * 0.6 * this.unit, ground);
        }
        break;
      case 'walking': {
        this.y = ground.y;
        const dx = this.walkTo - this.x;
        if (Math.abs(dx) < 0.02 * this.unit) {
          this.setState('idle');
          this.idleFor = 1.5 + Math.random() * 3.5;
        } else {
          this.facing = dx > 0 ? 1 : -1;
          this.x += Math.sign(dx) * Math.min(Math.abs(dx), SPEED[this.species] * this.unit * dt * this.gait());
        }
        break;
      }
      case 'carried':
        this.x += (this.carryX - this.x) * Math.min(1, dt * 14);
        this.y += (this.carryY - this.y) * Math.min(1, dt * 14);
        break;
      case 'falling':
        this.vy -= 3.2 * this.unit * dt;
        this.y += this.vy * dt;
        if (this.y <= ground.y) {
          this.y = ground.y;
          this.x = this.clampX(this.x, ground);
          this.nudge();
          this.setState('idle');
          this.idleFor = 1 + Math.random() * 2;
        }
        break;
      case 'leaving':
        this.y = ground.y;
        this.facing = this.leaveDir;
        this.x += this.leaveDir * Math.max(0.12, SPEED[this.species]) * this.unit * dt * this.gait();
        if (this.x < ground.minX - 0.4 * this.unit || this.x > ground.maxX + 0.4 * this.unit) this.setState('gone');
        break;
      case 'leaping': {
        const t = Math.min(1, this.stateTime / 1.1);
        this.x = this.leapFrom[0] + (this.leapTo[0] - this.leapFrom[0]) * t;
        this.y = this.leapFrom[1] + (this.leapTo[1] - this.leapFrom[1]) * t + Math.sin(Math.PI * t) * 0.35 * this.unit;
        this.facing = this.leapTo[0] >= this.leapFrom[0] ? 1 : -1;
        if (t > 0.7) this.fade = Math.max(0, 1 - (t - 0.7) / 0.3);
        if (t >= 1) this.setState('gone');
        break;
      }
      case 'gone':
        break;
    }

    this.blinkIn -= dt;
    if (this.blinkIn < -0.13) this.blinkIn = 2.5 + Math.random() * 4;
  }

  /** Walking rhythm multiplier (hares move in bursts, everything else steadily). */
  private gait(): number {
    if (this.species === 'hare') {
      const p = (this.phase / 0.7) % 1;
      return p < 0.55 ? 1.8 : 0.0;
    }
    return 1;
  }

  /** Pose the working copy for this frame. */
  private pose(): void {
    const w = this.work;
    w.set(this.rest);
    const moving = this.state === 'walking' || this.state === 'leaving';
    const t = this.phase;
    switch (this.species) {
      case 'hare': {
        const p = (t / 0.7) % 1;
        const flop = moving ? Math.sin(p * Math.PI * 2) * 0.22 : Math.sin(t * 7) * 0.03 * (Math.sin(t * 0.7) > 0.8 ? 1 : 0);
        this.rotateChain(CHAINS.index, flop);
        this.rotateChain(CHAINS.middle, flop * 0.8);
        break;
      }
      case 'lion': {
        const roar = this.roarTime >= 0 ? Math.sin(Math.min(1, this.roarTime / 0.9) * Math.PI) : 0;
        for (const chain of [CHAINS.index, CHAINS.middle, CHAINS.ring, CHAINS.pinky]) this.rotateChain(chain, -0.45 * roar);
        this.rotateChain(CHAINS.thumb, 0.4 * roar);
        if (moving) this.rotateAll(Math.sin(t * 5) * 0.025);
        break;
      }
      case 'stag':
        if (moving) this.rotateAll(Math.sin(t * 6) * 0.05);
        else this.rotateAll(Math.sin(t * 0.8) * 0.02);
        break;
      case 'peacock': {
        const fan = 0.5 + 0.5 * Math.sin(t * 1.3);
        const chains = [CHAINS.index, CHAINS.middle, CHAINS.ring, CHAINS.pinky];
        chains.forEach((chain, k) => this.rotateChainAbout(chain, PALM, (k - 1.5) * 0.09 * fan));
        break;
      }
      case 'crocodile':
        this.rotateChain(CHAINS.thumb, Math.max(0, Math.sin(t * 2.2)) * 0.45);
        break;
      case 'tortoise': {
        const poke = 0.5 + 0.5 * Math.sin(t * 1.4);
        this.extendChain(CHAINS.thumb, -0.012 + poke * 0.014);
        break;
      }
      case 'snake':
        for (let i = 0; i < POINT_COUNT; i++) w[i * 2 + 1] += Math.sin(w[i * 2] * 22 - t * 5) * 0.012;
        break;
      case 'wisp':
        for (let i = 0; i < POINT_COUNT; i++) w[i * 2] += Math.sin(t * 2 + w[i * 2 + 1] * 18) * 0.008;
        break;
    }
  }

  private rotateAbout(i: number, px: number, py: number, c: number, s: number): void {
    const w = this.work;
    const x = w[i * 2] - px;
    const y = w[i * 2 + 1] - py;
    w[i * 2] = px + x * c - y * s;
    w[i * 2 + 1] = py + x * s + y * c;
  }

  private rotateChain(chain: readonly number[], angle: number): void {
    if (angle === 0) return;
    const px = this.work[chain[0] * 2];
    const py = this.work[chain[0] * 2 + 1];
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let k = 1; k < chain.length; k++) this.rotateAbout(chain[k], px, py, c, s);
  }

  private rotateChainAbout(chain: readonly number[], pivot: number, angle: number): void {
    const px = this.work[pivot * 2];
    const py = this.work[pivot * 2 + 1];
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const i of chain) this.rotateAbout(i, px, py, c, s);
  }

  private rotateAll(angle: number): void {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < POINT_COUNT; i++) this.rotateAbout(i, 0, 0, c, s);
  }

  private extendChain(chain: readonly number[], amount: number): void {
    const w = this.work;
    const a = chain[0], b = chain[chain.length - 1];
    let dx = w[b * 2] - w[a * 2], dy = w[b * 2 + 1] - w[a * 2 + 1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    for (let k = 1; k < chain.length; k++) {
      w[chain[k] * 2] += dx * amount * (k / (chain.length - 1));
      w[chain[k] * 2 + 1] += dy * amount * (k / (chain.length - 1));
    }
  }

  /** Stage position of a posed local point. */
  private sx(i: number, s: number): number {
    return this.x + this.facing * this.work[i * 2] * s;
  }
  private sy(i: number, hop: number, s: number): number {
    return this.y + this.work[i * 2 + 1] * s + hop;
  }

  /** True if a stage point is within the creature's body (generous). */
  hit(x: number, y: number, pad = 0.04): boolean {
    return Math.abs(x - this.x) < this.halfWidth + pad && y > this.y - pad && y < this.y + this.fullHeight + pad;
  }

  /** Draw a small reflected copy (upside down, rippling) centred at cx, cy. */
  emitMirror(layer: ShadowLayer, cx: number, cy: number, size: number, time: number): void {
    if (size <= 0.01) return;
    this.pose();
    const s = (size * 0.32) / Math.max(0.05, this.height);
    const top = this.height;
    HAND_BONES.forEach(([a, b, , arm], k) => {
      if (arm) return;
      const ripple = (i: number) => Math.sin(this.work[i * 2 + 1] * 30 + time * 3) * 0.006;
      const ax = cx - this.facing * this.work[a * 2] * s + ripple(a);
      const bx = cx - this.facing * this.work[b * 2] * s + ripple(b);
      const ay = cy - (this.work[a * 2 + 1] - top / 2) * s;
      const by = cy - (this.work[b * 2 + 1] - top / 2) * s;
      layer.push(ax, ay, bx, by, this.boneRadii[k] * s, 0.7);
    });
  }

  emit(layer: ShadowLayer, ember = 0): void {
    if (this.state === 'gone') return;
    this.pose();
    let hop = 0;
    if (this.species === 'hare' && (this.state === 'walking' || this.state === 'leaving')) {
      const p = (this.phase / 0.7) % 1;
      hop = p < 0.55 ? Math.sin((p / 0.55) * Math.PI) * 0.09 * this.unit : 0;
    }
    if (this.species === 'wisp' && this.state !== 'awakening') hop = (0.06 + Math.sin(this.phase * 1.7) * 0.03) * this.unit;
    if (this.nudgeTime >= 0) hop += Math.sin((this.nudgeTime / 0.6) * Math.PI) * 0.07 * this.unit;
    let s = this.scale;
    if (this.roarTime >= 0) s *= 1 + 0.08 * Math.sin(Math.min(1, this.roarTime / 0.9) * Math.PI);
    if (this.species === 'wisp') s *= 1 + Math.sin(this.phase * 9) * 0.02;
    s *= this.fade;
    if (s <= 0.001) return;

    const awaken = this.state === 'awakening' ? Math.min(1, this.stateTime / AWAKEN_TIME) : 1;
    const armFade = 1 - awaken;
    const glow = this.state === 'awakening' ? 1 - awaken : ember;
    const depth = this.depth + (0.92 - this.depth) * awaken; // creatures settle crisp, near the wall

    HAND_BONES.forEach(([a, b, , arm], k) => {
      let r = this.boneRadii[k] * s;
      if (arm) {
        if (armFade <= 0.02) return;
        r *= armFade;
      }
      layer.push(this.sx(a, s), this.sy(a, hop, s), this.sx(b, s), this.sy(b, hop, s), r, depth, glow);
    });

    if (this.blinkIn > 0 && awaken >= 1) {
      const ex = this.x + this.facing * this.eyeLocal[0] * s;
      const ey = this.y + this.eyeLocal[1] * s + hop;
      const er = 0.011 * this.unit;
      layer.push(ex, ey, ex, ey, er, depth, 0, CapsuleKind.Eye);
    }
  }
}
