/**
 * The shadow layer: every shadow on the stage (your hands, the creatures, the
 * scenery) is a list of 2D capsules in stage metres, drawn into one small
 * render target. The wall shader reads it back with contact-hardening
 * softness, so a hand near the lantern throws a big blurred shadow and a hand
 * near the wall a crisp one.
 *
 * Render target channels (all combined with MAX blending):
 *   R  coverage (0..1)
 *   G  coverage × occluder depth fraction (0 near the lantern, 1 at the wall)
 *   B  "light hole" mask: creature eyes, which let light through
 *   A  ember: a warm rim drawn while a shape is awakening
 */
import {
  Color,
  DataTexture,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  MaxEquation,
  Mesh,
  OneFactor,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  WebGLRenderTarget,
  CustomBlending,
  type WebGLRenderer,
} from '@iwsdk/core';

export const MAX_CAPSULES = 768;

export const enum CapsuleKind {
  Shadow = 0,
  Eye = 1,
}

const vertexShader = /* glsl */ `
  attribute vec4 aSeg;     // ax, ay, bx, by (stage metres)
  attribute vec4 aParams;  // radius, depth fraction, ember, kind
  varying vec2 vPos;
  varying vec4 vSeg;
  varying vec4 vParams;
  void main() {
    float r = aParams.x;
    vec2 lo = min(aSeg.xy, aSeg.zw) - vec2(r + 0.01);
    vec2 hi = max(aSeg.xy, aSeg.zw) + vec2(r + 0.01);
    vec2 p = mix(lo, hi, position.xy * 0.5 + 0.5);
    vPos = p;
    vSeg = aSeg;
    vParams = aParams;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vPos;
  varying vec4 vSeg;
  varying vec4 vParams;
  uniform float uPixel; // metres per render-target pixel
  void main() {
    vec2 a = vSeg.xy;
    vec2 b = vSeg.zw;
    vec2 pa = vPos - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    float d = length(pa - ba * h) - vParams.x;
    float cov = 1.0 - smoothstep(-uPixel, uPixel, d);
    if (cov <= 0.0) discard;
    if (vParams.w > 0.5) {
      gl_FragColor = vec4(0.0, 0.0, cov, 0.0);
    } else {
      gl_FragColor = vec4(cov, cov * vParams.y, 0.0, cov * vParams.z);
    }
  }
`;

export class ShadowLayer {
  readonly target: WebGLRenderTarget;
  /** Stage size in metres; the render target covers exactly this rectangle. */
  width = 2;
  height = 1.25;

  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(0, 2, 1.25, 0, -1, 1);
  private readonly seg = new Float32Array(MAX_CAPSULES * 4);
  private readonly params = new Float32Array(MAX_CAPSULES * 4);
  private readonly segAttr: InstancedBufferAttribute;
  private readonly paramsAttr: InstancedBufferAttribute;
  private readonly geometry: InstancedBufferGeometry;
  private readonly material: ShaderMaterial;
  private count = 0;
  private readonly savedClear = new Color();
  /** A 1×1 transparent texture used before the first render. */
  readonly empty: DataTexture;

  constructor(resolution = 1024) {
    this.target = new WebGLRenderTarget(resolution, Math.round(resolution * 0.625), {
      format: RGBAFormat,
      type: UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
    });
    this.target.texture.name = 'ChhayaShadowLayer';

    this.geometry = new InstancedBufferGeometry();
    this.geometry.setAttribute(
      'position',
      new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3),
    );
    this.segAttr = new InstancedBufferAttribute(this.seg, 4);
    this.paramsAttr = new InstancedBufferAttribute(this.params, 4);
    this.segAttr.setUsage(35048); // DynamicDrawUsage
    this.paramsAttr.setUsage(35048);
    this.geometry.setAttribute('aSeg', this.segAttr);
    this.geometry.setAttribute('aParams', this.paramsAttr);
    this.geometry.instanceCount = 0;

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uPixel: { value: 0.002 } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendEquation: MaxEquation,
      blendEquationAlpha: MaxEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
    });
    const mesh = new Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    this.empty = new DataTexture(new Uint8Array(4), 1, 1);
    this.empty.needsUpdate = true;
  }

  /** Resize the stage rectangle the layer covers (keeps texel aspect square-ish). */
  setStageSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
    const w = this.target.width;
    const h = Math.max(64, Math.round((w * height) / width));
    if (h !== this.target.height) this.target.setSize(w, h);
    this.material.uniforms.uPixel.value = (width / w) * 1.25;
  }

  begin(): void {
    this.count = 0;
  }

  get used(): number {
    return this.count;
  }

  push(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
    depth: number,
    ember = 0,
    kind: CapsuleKind = CapsuleKind.Shadow,
  ): void {
    if (this.count >= MAX_CAPSULES || !(radius > 0)) return;
    const i = this.count++ * 4;
    this.seg[i] = ax;
    this.seg[i + 1] = ay;
    this.seg[i + 2] = bx;
    this.seg[i + 3] = by;
    this.params[i] = radius;
    this.params[i + 1] = depth;
    this.params[i + 2] = ember;
    this.params[i + 3] = kind;
  }

  render(renderer: WebGLRenderer): void {
    this.geometry.instanceCount = this.count;
    this.segAttr.addUpdateRange(0, this.count * 4);
    this.paramsAttr.addUpdateRange(0, this.count * 4);
    this.segAttr.needsUpdate = true;
    this.paramsAttr.needsUpdate = true;

    // In an XR session three.js swaps any camera for the headset camera, so
    // switch XR off for this offscreen pass and restore the frame's target.
    const xrEnabled = renderer.xr.enabled;
    const previousTarget = renderer.getRenderTarget();
    const previousClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.savedClear);
    renderer.xr.enabled = false;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(this.savedClear, previousClearAlpha);
    renderer.xr.enabled = xrEnabled;
  }

  dispose(): void {
    this.target.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.empty.dispose();
  }
}
