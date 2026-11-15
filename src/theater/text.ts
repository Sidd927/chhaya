/**
 * Text written in lantern light: captions and "light buttons" drawn into
 * canvas textures. Fonts are bundled (SIL Open Font License) and loaded before
 * the first caption is drawn.
 */
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from '@iwsdk/core';
import frauncesRegular from '@fontsource/fraunces/files/fraunces-latin-400-normal.woff2?url';
import frauncesItalic from '@fontsource/fraunces/files/fraunces-latin-400-italic.woff2?url';
import frauncesSemibold from '@fontsource/fraunces/files/fraunces-latin-600-normal.woff2?url';
import manropeMedium from '@fontsource/manrope/files/manrope-latin-500-normal.woff2?url';
import manropeBold from '@fontsource/manrope/files/manrope-latin-700-normal.woff2?url';

let fontsReady: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  const faces = [
    new FontFace('Fraunces', `url(${frauncesRegular})`, { weight: '400', style: 'normal' }),
    new FontFace('Fraunces', `url(${frauncesItalic})`, { weight: '400', style: 'italic' }),
    new FontFace('Fraunces', `url(${frauncesSemibold})`, { weight: '600', style: 'normal' }),
    new FontFace('Manrope', `url(${manropeMedium})`, { weight: '500', style: 'normal' }),
    new FontFace('Manrope', `url(${manropeBold})`, { weight: '700', style: 'normal' }),
  ];
  fontsReady = Promise.all(
    faces.map((f) =>
      f.load().then(
        (loaded) => {
          document.fonts.add(loaded);
        },
        () => undefined,
      ),
    ),
  ).then(() => undefined);
  return fontsReady;
}

export type TextStyle = 'narration' | 'instruction' | 'title' | 'subtitle' | 'label';

const STYLES: Record<TextStyle, { font: string; color: string; size: number; spacing?: number; upper?: boolean; halo?: boolean }> = {
  label: { font: '700 {s}px Manrope, Helvetica, sans-serif', color: '#1A120B', size: 64, spacing: 5, upper: true, halo: false },
  narration: { font: 'italic 400 {s}px Fraunces, Georgia, serif', color: '#F6E4C6', size: 112 },
  instruction: { font: '700 {s}px Manrope, Helvetica, sans-serif', color: '#F2B866', size: 96, spacing: 6, upper: true },
  title: { font: '600 {s}px Fraunces, Georgia, serif', color: '#FBEBD0', size: 230 },
  subtitle: { font: 'italic 400 {s}px Fraunces, Georgia, serif', color: '#E9C99A', size: 92 },
};

/** A plane of text that fades in and out. Width in metres; height follows aspect. */
export class TextPlane {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly material: MeshBasicMaterial;
  private current = '';
  private pending: string | null = null;
  private opacity = 0;
  private target = 0;

  constructor(
    private readonly style: TextStyle,
    widthMeters: number,
    private readonly pxWidth = 2048,
    private readonly pxHeight = 256,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxWidth;
    this.canvas.height = pxHeight;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.texture.generateMipmaps = false;
    this.material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), this.material);
    this.mesh.renderOrder = 30;
    this.mesh.frustumCulled = false;
    this.setWidth(widthMeters);
  }

  setWidth(widthMeters: number): void {
    this.mesh.scale.set(widthMeters, (widthMeters * this.pxHeight) / this.pxWidth, 1);
  }

  /** Show text (lines separated by \n). Cross-fades if something is showing. */
  show(text: string): void {
    if (text === this.current && this.target === 1) return;
    if (this.opacity > 0.05 && text !== this.current) {
      this.pending = text;
      this.target = 0;
      return;
    }
    this.draw(text);
    this.target = 1;
  }

  hide(): void {
    this.pending = null;
    this.target = 0;
  }

  get text(): string {
    return this.current;
  }

  update(dt: number): void {
    const speed = this.target > this.opacity ? 2.2 : 3.5;
    this.opacity += Math.sign(this.target - this.opacity) * Math.min(Math.abs(this.target - this.opacity), dt * speed);
    if (this.pending !== null && this.opacity <= 0.01) {
      this.draw(this.pending);
      this.pending = null;
      this.target = 1;
    }
    this.material.opacity = this.opacity;
    this.mesh.visible = this.opacity > 0.001;
  }

  private draw(text: string): void {
    this.current = text;
    const st = STYLES[this.style];
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.pxWidth, this.pxHeight);
    const lines = text.split('\n');
    let size = st.size;
    const spacing = st.spacing ?? 0;
    const label = (l: string) => (st.upper ? l.toUpperCase() : l);
    // Shrink to fit the canvas width.
    for (;;) {
      ctx.font = st.font.replace('{s}', String(size));
      (ctx as any).letterSpacing = `${spacing}px`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(label(l)).width));
      const tall = lines.length * size * 1.25;
      if ((widest <= this.pxWidth * 0.96 && tall <= this.pxHeight * 0.96) || size < 14) break;
      size -= 4;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = size * 1.25;
    const top = this.pxHeight / 2 - ((lines.length - 1) * lineH) / 2;
    // A faint dark halo keeps light text legible on bright real walls.
    ctx.shadowColor = 'rgba(10, 6, 3, 0.85)';
    ctx.shadowBlur = st.halo === false ? 0 : size * 0.35;
    ctx.fillStyle = st.color;
    lines.forEach((l, i) => ctx.fillText(label(l), this.pxWidth / 2, top + i * lineH));
    ctx.shadowBlur = 0;
    ctx.fillText('', 0, 0);
    this.texture.needsUpdate = true;
  }
}

const ringVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ringFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uProgress;
  uniform float uHover;
  uniform float uOpacity;
  uniform float uTime;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float a = atan(c.x, c.y) / 6.28318 + 0.5;
    float aa = fwidth(r) * 1.5;
    // An ink medallion with a lantern-gold ring that fills while covered.
    float disc = 1.0 - smoothstep(0.6 - aa, 0.6 + aa, r);
    float glyph = 1.0 - smoothstep(0.16 - aa, 0.16 + aa, r);
    float breathe = 0.5 + 0.5 * sin(uTime * 2.2);
    float ringBand = 1.0 - smoothstep(0.05 - aa, 0.05 + aa, abs(r - 0.8));
    float fill = ringBand * step(1.0 - uProgress, a);
    vec3 ink = vec3(0.045, 0.032, 0.024);
    vec3 gold = vec3(1.0, 0.72, 0.36);
    vec3 col = ink;
    float alpha = disc * 0.9;
    col = mix(col, gold * (0.8 + 0.2 * breathe), glyph * (0.6 + 0.4 * uHover));
    col = mix(col, gold * 1.15, fill);
    col = mix(col, gold * 0.7, ringBand * (1.0 - fill) * (0.35 + 0.4 * uHover));
    alpha = max(alpha, ringBand * mix(0.35 + 0.4 * uHover, 1.0, fill));
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

/**
 * A button made of light on the wall. You press it by covering it with your
 * hand's shadow and holding still, or by pinching while it is covered.
 */
export class LightButton {
  readonly group: Mesh;
  readonly label: TextPlane;
  readonly ringMaterial: ShaderMaterial;
  progress = 0;
  covered = false;
  enabled = false;
  /** Stage coordinates of the button centre. */
  x = 0;
  y = 0;
  radius = 0.1;
  private visibility = 0;

  constructor(text: string, readonly id: string) {
    this.ringMaterial = new ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { uProgress: { value: 0 }, uHover: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    });
    this.group = new Mesh(new PlaneGeometry(1, 1), this.ringMaterial);
    this.group.renderOrder = 25;
    this.group.frustumCulled = false;
    this.group.visible = false;
    this.label = new TextPlane('label', 0.5, 1024, 112);
    this.label.show(text);
  }

  setText(text: string): void {
    this.label.show(text);
  }

  update(dt: number, time: number): boolean {
    const target = this.enabled ? 1 : 0;
    this.visibility += Math.sign(target - this.visibility) * Math.min(Math.abs(target - this.visibility), dt * 2.5);
    const u = this.ringMaterial.uniforms;
    u.uOpacity.value = this.visibility;
    u.uHover.value += ((this.covered ? 1 : 0) - u.uHover.value) * Math.min(1, dt * 8);
    u.uTime.value = time;
    let fired = false;
    if (this.enabled && this.visibility > 0.9 && this.covered) {
      this.progress += dt / 1.1;
      if (this.progress >= 1) {
        fired = true;
        this.progress = 0;
      }
    } else {
      this.progress = Math.max(0, this.progress - dt * 2);
    }
    u.uProgress.value = this.progress;
    this.group.visible = this.visibility > 0.001;
    this.label.mesh.visible = this.group.visible;
    (this.label.mesh.material as MeshBasicMaterial).opacity = this.visibility;
    return fired;
  }
}
