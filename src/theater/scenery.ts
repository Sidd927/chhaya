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

function tree(x: number, height: number, seed: number): Cap[] {
  const r = seeded(seed);
  const caps: Cap[] = [];
  const top = height;
  caps.push([x, 0, x + 0.01, top * 0.62, 0.022]);
  caps.push([x - 0.035, 0, x, 0.06, 0.012]);
  caps.push([x + 0.035, 0, x, 0.05, 0.012]);
  const branches = 5;
  for (let i = 0; i < branches; i++) {
    const by = top * (0.35 + 0.08 * i);
    const dir = i % 2 === 0 ? -1 : 1;
    const len = 0.08 + r() * 0.07;
    caps.push([x, by, x + dir * len, by + 0.06 + r() * 0.05, 0.007]);
  }
  // Canopy: a cloud of round leaves clusters.
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const cx = x + Math.cos(a) * d * 0.17;
    const cy = top * 0.78 + Math.sin(a) * d * 0.11;
    const rad = 0.03 + r() * 0.035;
    caps.push([cx, cy, cx + (r() - 0.5) * 0.02, cy, rad]);
  }
  return caps;
}

function grass(width: number, seed: number): Cap[] {
  const r = seeded(seed);
  const caps: Cap[] = [[-0.2, -0.02, width + 0.2, -0.02, 0.07]];
  const blades = Math.round(width * 70);
  for (let i = 0; i < blades; i++) {
    const x = (i / blades) * width + (r() - 0.5) * 0.02;
    const h = 0.04 + r() * 0.045;
    const lean = (r() - 0.5) * 0.03;
    caps.push([x, 0.03, x + lean, 0.03 + h, 0.0028]);
  }
  return caps;
}

/** A village well: stone drum, two posts, a beam, a rope and a bucket. */
function well(x: number): Cap[] {
  const caps: Cap[] = [];
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
  return caps;
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

  layout(width: number, height: number): void {
    if (Math.abs(width - this.width) < 1e-3) return;
    this.width = width;
    this.grassCaps = grass(width, 11);
    this.treeCaps = [...tree(width * 0.07, height * 0.82, 3), ...tree(width * 0.95, height * 0.66, 9)];
    this.wellX = width * 0.74;
    this.wellCaps = well(this.wellX);
  }

  /** Top of the ground where creatures stand. */
  get groundY(): number {
    return 0.07;
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
      const sink = (1 - f) * 0.12;
      for (const c of this.grassCaps) layer.push(c[0], c[1] - sink, c[2], c[3] - sink, c[4], 0.97);
      const tsink = (1 - f) * 0.9;
      for (const c of this.treeCaps) layer.push(c[0], c[1] - tsink, c[2], c[3] - tsink, c[4] * f, 0.95);
    }
    const w = ease(this.wellGrow);
    if (w > 0.001) {
      const sink = (1 - w) * 0.65;
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
        0.016 * alpha,
        0.95,
      );
    }
  }
}
