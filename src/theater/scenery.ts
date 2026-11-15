/**
 * Shadow scenery, drawn with the same capsules as everything else so props
 * and creatures share one hand-cut look: grass, two trees and an old well.
 * Each prop has a `grow` value (0..1) so it can rise out of the ground.
 */
import type { ShadowLayer } from './shadow-layer.js';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Cap = [number, number, number, number, number];

function tree(x: number, height: number, seed: number, u: number): Cap[] {
  const r = seeded(seed);
  const caps: Cap[] = [];
  const top = height;
  caps.push([x, 0, x + 0.01 * u, top * 0.62, 0.022 * u]);
  caps.push([x - 0.035 * u, 0, x, 0.06 * u, 0.012 * u]);
  caps.push([x + 0.035 * u, 0, x, 0.05 * u, 0.012 * u]);
  const branches = 5;
  for (let i = 0; i < branches; i++) {
    const by = top * (0.35 + 0.08 * i);
    const dir = i % 2 === 0 ? -1 : 1;
    const len = (0.08 + r() * 0.07) * u;
    caps.push([x, by, x + dir * len, by + (0.06 + r() * 0.05) * u, 0.007 * u]);
  }
  // Canopy: a cloud of round leaves clusters.
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const cx = x + Math.cos(a) * d * 0.17 * u;
    const cy = top * 0.78 + Math.sin(a) * d * 0.11 * u;
    const rad = (0.03 + r() * 0.035) * u;
    caps.push([cx, cy, cx + (r() - 0.5) * 0.02 * u, cy, rad]);
  }
  return caps;
}

function grass(width: number, seed: number, u: number): Cap[] {
  const r = seeded(seed);
  const caps: Cap[] = [[-0.2, -0.02 * u, width + 0.2, -0.02 * u, 0.07 * u]];
  const blades = Math.round((width * 70) / u);
  for (let i = 0; i < blades; i++) {
    const x = (i / blades) * width + (r() - 0.5) * 0.02 * u;
    const h = (0.04 + r() * 0.045) * u;
    const lean = (r() - 0.5) * 0.03 * u;
    caps.push([x, 0.03 * u, x + lean, 0.03 * u + h, 0.0028 * u]);
  }
  return caps;
}

/** A village well: stone drum, two posts, a beam, a rope and a bucket. */
function well(x: number, u: number): Cap[] {
  const raw: Cap[] = [];
  const caps = raw;
  const w = 0.17;
  for (let row = 0; row < 5; row++) {
    const y = 0.05 + row * 0.04;
    const off = row % 2 === 0 ? 0 : 0.02;
    caps.push([x - w + off, y, x + w - off, y, 0.021]);
  }
  caps.push([x - w + 0.01, 0.05, x - w + 0.01, 0.48, 0.011]);
  caps.push([x + w - 0.01, 0.05, x + w - 0.01, 0.48, 0.011]);
  caps.push([x - w - 0.03, 0.48, x + w + 0.03, 0.48, 0.013]);
  caps.push([x - w - 0.05, 0.5, x, 0.58, 0.01]);
  caps.push([x + w + 0.05, 0.5, x, 0.58, 0.01]);
  caps.push([x, 0.48, x, 0.33, 0.0025]);
  caps.push([x - 0.025, 0.31, x + 0.025, 0.31, 0.02]);
  caps.push([x - 0.02, 0.29, x + 0.02, 0.29, 0.018]);
  return raw.map(([ax, ay, bx, by, r]) => [x + (ax - x) * u, ay * u, x + (bx - x) * u, by * u, r * u] as Cap);
}

export class Scenery {
  forest = 0;
  wellGrow = 0;
  forestTarget = 0;
  wellTarget = 0;
  wellX = 1.5;
  private grassCaps: Cap[] = [];
  private treeCaps: Cap[] = [];
  private wellCaps: Cap[] = [];
  private width = 0;
  unit = 1;

  layout(width: number, height: number): void {
    this.width = width;
    const u = (this.unit = height / 1.3);
    this.grassCaps = grass(width, 11, u);
    this.treeCaps = [...tree(width * 0.07, height * 0.82, 3, u), ...tree(width * 0.95, height * 0.66, 9, u)];
    this.wellX = width * 0.74;
    this.wellCaps = well(this.wellX, u);
  }

  /** Top of the ground where creatures stand. */
  get groundY(): number {
    return 0.07 * this.unit;
  }

  update(dt: number): void {
    const step = (v: number, t: number) => v + Math.sign(t - v) * Math.min(Math.abs(t - v), dt * 0.7);
    this.forest = step(this.forest, this.forestTarget);
    this.wellGrow = step(this.wellGrow, this.wellTarget);
  }

  emit(layer: ShadowLayer): void {
    const ease = (t: number) => t * t * (3 - 2 * t);
    const f = ease(this.forest);
    if (f > 0.001) {
      const sink = (1 - f) * 0.12 * this.unit;
      for (const c of this.grassCaps) layer.push(c[0], c[1] - sink, c[2], c[3] - sink, c[4], 0.97);
      const tsink = (1 - f) * 0.9;
      for (const c of this.treeCaps) layer.push(c[0], c[1] - tsink, c[2], c[3] - tsink, c[4] * f, 0.95);
    }
    const w = ease(this.wellGrow);
    if (w > 0.001) {
      const sink = (1 - w) * 0.65 * this.unit;
      for (const c of this.wellCaps) layer.push(c[0], c[1] - sink, c[2], c[3] - sink, c[4], 0.96);
    }
  }

  /** Draw a ring of stones: the well's water, seen from above, as a vignette. */
  emitWaterRing(layer: ShadowLayer, cx: number, cy: number, radius: number, alpha: number): void {
    if (alpha <= 0.01) return;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      layer.push(
        cx + Math.cos(a0) * radius,
        cy + Math.sin(a0) * radius,
        cx + Math.cos(a1) * radius,
        cy + Math.sin(a1) * radius,
        0.016 * alpha * this.unit,
        0.95,
      );
    }
  }
}
