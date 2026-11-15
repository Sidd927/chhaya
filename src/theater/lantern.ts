/**
 * The lantern: the single light source of the theater. A small procedural
 * paper lantern that floats within reach; pinch it to move it, and every
 * shadow on the wall changes size and softness accordingly.
 */
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from '@iwsdk/core';

function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,150,1)');
  grad.addColorStop(0.25, 'rgba(255,170,90,0.55)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class Lantern {
  readonly group = new Group();
  intensity = 1;
  grabbedBy: 'left' | 'right' | null = null;
  /** 0..1 how close a free hand is (for the highlight). */
  nearness = 0;

  private readonly paper: MeshBasicMaterial;
  private readonly halo: Sprite;
  private readonly core: Sprite;
  private readonly base = new Color(1.0, 0.72, 0.42);
  private t = Math.random() * 100;
  private readonly grabOffset = new Vector3();

  constructor() {
    this.group.name = 'ChhayaLantern';
    // Profile of a round paper lantern, 11 cm tall.
    const pts: Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      pts.push(new Vector2(Math.sin(a) * 0.05 + 0.012, -Math.cos(a) * 0.052));
    }
    this.paper = new MeshBasicMaterial({ color: this.base.clone(), transparent: true, opacity: 0.96 });
    const body = new Mesh(new LatheGeometry(pts, 24), this.paper);
    body.renderOrder = 20;
    this.group.add(body);

    const frameMat = new MeshBasicMaterial({ color: 0x2a1a10 });
    for (const y of [-0.052, 0.052]) {
      const cap = new Mesh(new TorusGeometry(0.014, 0.004, 6, 18), frameMat);
      cap.rotation.x = Math.PI / 2;
      cap.position.y = y;
      cap.renderOrder = 21;
      this.group.add(cap);
    }
    for (const y of [-0.026, 0, 0.026]) {
      const r = Math.sqrt(Math.max(0, 0.052 * 0.052 - y * y)) * (0.05 / 0.052) + 0.012;
      const rib = new Mesh(new TorusGeometry(r + 0.0006, 0.0012, 4, 32), frameMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = y;
      rib.renderOrder = 21;
      this.group.add(rib);
    }
    const loop = new Mesh(new TorusGeometry(0.012, 0.0018, 6, 16), frameMat);
    loop.position.y = 0.066;
    loop.renderOrder = 21;
    this.group.add(loop);

    const tex = glowTexture();
    this.core = new Sprite(new SpriteMaterial({ map: tex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    this.core.scale.setScalar(0.1);
    this.core.renderOrder = 22;
    this.group.add(this.core);
    this.halo = new Sprite(
      new SpriteMaterial({ map: tex, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }),
    );
    this.halo.scale.setScalar(0.24);
    this.halo.renderOrder = 19;
    this.group.add(this.halo);
    this.group.scale.setScalar(0.7);
    this.group.visible = false;
  }

  /** Live position (IWSDK swaps an entity's position vector, so never cache it). */
  get position(): Vector3 {
    return this.group.position;
  }

  /** The light's emitting point (centre of the lantern). */
  get light(): Vector3 {
    return this.group.position;
  }

  startGrab(side: 'left' | 'right', pinch: Vector3): void {
    this.grabbedBy = side;
    this.grabOffset.subVectors(this.group.position, pinch);
  }

  moveGrab(pinch: Vector3): void {
    this.group.position.copy(pinch).add(this.grabOffset);
  }

  endGrab(): void {
    this.grabbedBy = null;
  }

  update(dt: number, brightness: number): void {
    this.t += dt;
    // Candle-like flicker from a few incommensurate sines.
    const f =
      0.93 +
      0.03 * Math.sin(this.t * 7.3) +
      0.025 * Math.sin(this.t * 13.1 + 1.7) +
      0.015 * Math.sin(this.t * 23.7 + 0.3);
    this.intensity = f * brightness;
    this.paper.color.copy(this.base).multiplyScalar(0.55 + 0.5 * this.intensity);
    const hl = this.grabbedBy ? 1 : this.nearness;
    this.core.scale.setScalar(0.09 + 0.015 * f + hl * 0.03);
    this.halo.scale.setScalar(0.2 + 0.03 * f + hl * 0.12);
    (this.halo.material as SpriteMaterial).opacity = 0.16 + 0.08 * f * brightness + hl * 0.2;
  }
}
