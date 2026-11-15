/**
 * The stage: a rectangle on a real wall (or on a paper screen when no wall is
 * found). Owns the wall frame, the projection from the lantern onto the wall,
 * and the wall shader that turns the shadow layer into light and shadow over
 * passthrough.
 */
import {
  DoubleSide,
  Matrix4,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Texture,
} from '@iwsdk/core';
import type { ShadowLayer } from './shadow-layer.js';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uShadow;
  uniform vec2 uShadowSize;
  uniform vec2 uStage;
  uniform vec3 uLight;       // lantern foot point on the wall (x, y) and distance
  uniform float uLightSize;  // lantern aperture, metres
  uniform float uIntensity;  // flicker-modulated brightness
  uniform float uReveal;     // 0 dark, 1 full pool of light
  uniform float uPaper;      // 1 on the fallback paper screen
  uniform float uTime;
  uniform vec3 uWarm;
  uniform vec3 uInk;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float shadowAt(vec2 uv) {
    vec4 coarse = textureLod(uShadow, uv, 4.0);
    float blocker = coarse.r > 0.004 ? clamp(coarse.g / coarse.r, 0.05, 1.0) : 1.0;
    float penumbra = uLightSize * (1.0 - blocker) / blocker;          // metres on the wall
    float texel = uStage.x / uShadowSize.x;
    float lod = clamp(log2(max(penumbra / texel, 1.0)), 0.0, 4.2);
    vec2 o = vec2(penumbra * 0.35) / uStage;
    float s = textureLod(uShadow, uv, lod).r * 0.4;
    s += textureLod(uShadow, uv + vec2( o.x,  o.y * 0.6), lod).r * 0.15;
    s += textureLod(uShadow, uv + vec2(-o.x, -o.y * 0.6), lod).r * 0.15;
    s += textureLod(uShadow, uv + vec2(-o.x * 0.6,  o.y), lod).r * 0.15;
    s += textureLod(uShadow, uv + vec2( o.x * 0.6, -o.y), lod).r * 0.15;
    return clamp(s, 0.0, 1.0);
  }

  void main() {
    vec2 p = vUv * uStage;
    vec2 c = (vUv - 0.5) * 2.0;

    // Pool of lantern light: inverse-square with cosine falloff, shaped by a
    // soft superellipse so it reads as a lit stage rather than a rectangle.
    vec2 dxy = p - uLight.xy;
    float dist = sqrt(dot(dxy, dxy) + uLight.z * uLight.z);
    float irr = pow(uLight.z / dist, 2.4);
    float q = pow(pow(abs(c.x), 5.0) + pow(abs(c.y), 5.0), 0.2);
    float open = mix(0.0, 1.12, uReveal);
    float pool = 1.0 - smoothstep(open - 0.28, open, q);
    float light = irr * pool * uIntensity;

    float s = shadowAt(vUv);
    vec4 fine = textureLod(uShadow, vUv, 0.0);
    s *= 1.0 - fine.b;                                      // eyes let light through
    float ember = textureLod(uShadow, vUv, 1.0).a;
    float rim = ember * s * (1.0 - s) * 4.0;

    float grain = (hash(floor(p * 900.0) + floor(uTime * 24.0)) - 0.5) * 0.05;
    vec3 warm = uWarm * (0.82 + 0.18 * irr) + grain;
    vec3 col = mix(warm, uInk, s);
    col += vec3(1.0, 0.55, 0.18) * rim * 1.4;

    float litAlpha = 0.62 * light;
    float shadowAlpha = 0.93 * pool * smoothstep(0.0, 0.25, uReveal);
    float a = mix(litAlpha, shadowAlpha, s);
    a = max(a, rim * pool);

    if (uPaper > 0.5) {
      // Washi paper screen: always opaque-ish, fibres catch the light.
      float fibre = hash(floor(vec2(p.x * 160.0, p.y * 40.0))) * 0.06;
      vec3 paper = vec3(0.86, 0.80, 0.70) * (0.25 + 0.75 * light) + fibre * light;
      col = mix(paper + uWarm * light * 0.25, uInk, s * pool);
      float edge = smoothstep(1.0, 0.985, max(abs(c.x), abs(c.y)));
      a = 0.94 * edge * smoothstep(0.0, 0.3, uReveal);
    }
    gl_FragColor = vec4(col, a);
  }
`;

export interface StageFrame {
  center: Vector3;
  normal: Vector3; // points from the wall into the room
  width: number;
  height: number;
  paper: boolean;
}

export interface Projected {
  x: number;
  y: number;
  /** Scale from metres at the point to metres on the wall. */
  scale: number;
  /** Fraction of the lantern-to-wall distance (0 at lantern, 1 at wall). */
  depth: number;
  valid: boolean;
}

export class Stage {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  readonly origin = new Vector3();
  readonly center = new Vector3();
  readonly right = new Vector3(1, 0, 0);
  readonly up = new Vector3(0, 1, 0);
  readonly normal = new Vector3(0, 0, 1);
  width = 2;
  height = 1.25;
  paper = false;
  placed = false;

  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly basis = new Matrix4();

  constructor(private readonly layer: ShadowLayer) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
      blending: NormalBlending,
      uniforms: {
        uShadow: { value: layer.target.texture as Texture },
        uShadowSize: { value: [layer.target.width, layer.target.height] },
        uStage: { value: [2, 1.25] },
        uLight: { value: new Vector3(1, 0.6, 1.8) },
        uLightSize: { value: 0.05 },
        uIntensity: { value: 1 },
        uReveal: { value: 0 },
        uPaper: { value: 0 },
        uTime: { value: 0 },
        uWarm: { value: new Vector3(1.0, 0.74, 0.44) },
        uInk: { value: new Vector3(0.018, 0.014, 0.012) },
      },
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), this.material);
    this.mesh.name = 'ChhayaStage';
    this.mesh.renderOrder = 10;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  setFrame(frame: StageFrame): void {
    this.normal.copy(frame.normal).setY(0).normalize();
    this.up.set(0, 1, 0);
    this.right.crossVectors(this.up, this.normal).normalize();
    this.width = frame.width;
    this.height = frame.height;
    this.paper = frame.paper;
    this.center.copy(frame.center);
    this.origin
      .copy(this.center)
      .addScaledVector(this.right, -this.width / 2)
      .addScaledVector(this.up, -this.height / 2);

    this.basis.makeBasis(this.right, this.up, this.normal);
    this.mesh.quaternion.setFromRotationMatrix(this.basis);
    this.mesh.position.copy(this.center).addScaledVector(this.normal, 0.006);
    this.mesh.scale.set(this.width, this.height, 1);
    this.mesh.visible = true;

    this.layer.setStageSize(this.width, this.height);
    const u = this.material.uniforms;
    u.uStage.value = [this.width, this.height];
    u.uShadowSize.value = [this.layer.target.width, this.layer.target.height];
    u.uPaper.value = frame.paper ? 1 : 0;
    this.placed = true;
  }

  /** Signed distance of a world point in front of the wall (metres). */
  heightAbove(p: Vector3): number {
    return this.tmp.subVectors(p, this.origin).dot(this.normal);
  }

  /** Stage-plane coordinates of a world point (orthographic, no lantern). */
  toStage(p: Vector3, out: { x: number; y: number }): void {
    this.tmp.subVectors(p, this.origin);
    out.x = this.tmp.dot(this.right);
    out.y = this.tmp.dot(this.up);
  }

  /** World position of a stage-plane point, lifted `lift` metres off the wall. */
  toWorld(x: number, y: number, lift: number, out: Vector3): Vector3 {
    return out
      .copy(this.origin)
      .addScaledVector(this.right, x)
      .addScaledVector(this.up, y)
      .addScaledVector(this.normal, lift);
  }

  /** Project a world point from the lantern onto the wall. */
  project(light: Vector3, p: Vector3, out: Projected): Projected {
    const dL = this.heightAbove(light);
    const dP = this.heightAbove(p);
    if (dL < 0.15 || dP > dL - 0.03) {
      out.valid = false;
      return out;
    }
    const t = dL / (dL - dP);
    this.tmp2.subVectors(p, light).multiplyScalar(t).add(light);
    this.tmp.subVectors(this.tmp2, this.origin);
    out.x = this.tmp.dot(this.right);
    out.y = this.tmp.dot(this.up);
    out.scale = t;
    out.depth = Math.max(0.02, (dL - dP) / dL);
    out.valid = true;
    return out;
  }

  updateLight(light: Vector3, intensity: number, reveal: number, time: number): void {
    const u = this.material.uniforms;
    const foot = u.uLight.value as Vector3;
    this.tmp.subVectors(light, this.origin);
    foot.set(this.tmp.dot(this.right), this.tmp.dot(this.up), Math.max(0.2, this.tmp.dot(this.normal)));
    u.uIntensity.value = intensity;
    u.uReveal.value = reveal;
    u.uTime.value = time;
  }

  /** Is a stage point inside the lit rectangle (with margin)? */
  contains(x: number, y: number, margin = 0): boolean {
    return x >= -margin && y >= -margin && x <= this.width + margin && y <= this.height + margin;
  }
}
