/**
 * The director: one IWSDK system that runs the whole show — lights down,
 * choosing a wall, the first shadow, the first creature, the menu, the tale
 * and the open stage. Everything visual is driven from here each frame.
 */
import {
  AdditiveBlending,
  BackSide,
  createSystem,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import canonical from './canonical-shapes.json';
import { Sound } from './audio.js';
import { Creature, type Ground } from './creature.js';
import { ALL_SPECIES, SPECIES_INFO, type Species } from './hand-shape.js';
import { HAND_BONES, Hands, POINT_COUNT, type HandState, type Side } from './hands.js';
import { Lantern } from './lantern.js';
import { Save } from './save.js';
import { Scenery } from './scenery.js';
import { ShadowLayer } from './shadow-layer.js';
import { Stage, type Projected } from './stage.js';
import { LION_AND_HARE, type Beat, type TaleContext } from './tale.js';
import { LightButton, loadFonts, TextPlane } from './text.js';

type Phase = 'waiting' | 'dim' | 'wall' | 'curtain' | 'first-light' | 'first-shape' | 'menu' | 'tale' | 'tale-end' | 'open';

const MAX_CREATURES = 7;
const AWAKEN_SECONDS = 1.1;
const WISP_SECONDS = 2.6;

interface HandShadow {
  pts: Float32Array;
  radii: Float32Array;
  valid: boolean;
  depth: number;
  cx: number;
  cy: number;
  /** Awakening progress 0..1 and lock until the hand moves or changes shape. */
  awaken: number;
  locked: boolean;
  carrying: Creature | null;
  carryDx: number;
  carryDy: number;
}

const newShadow = (): HandShadow => ({
  pts: new Float32Array(POINT_COUNT * 2),
  radii: new Float32Array(HAND_BONES.length),
  valid: false,
  depth: 0.5,
  cx: 0,
  cy: 0,
  awaken: 0,
  locked: false,
  carrying: null,
  carryDx: 0,
  carryDy: 0,
});

/** Shared state other modules (and the debug hook) can read. */
export const theaterState = {
  phase: 'waiting' as Phase,
  creatures: 0,
  stagePlaced: false,
  paper: false,
  beat: -1,
};

export class TheaterSystem extends createSystem({}) {
  private layer!: ShadowLayer;
  private stage!: Stage;
  private lantern!: Lantern;
  private scenery!: Scenery;
  private hands!: Hands;
  private sound!: Sound;
  private save!: Save;
  private dimmer!: Mesh;
  private reticle!: Mesh;
  private narration!: TextPlane;
  private instruction!: TextPlane;
  private title!: TextPlane;
  private subtitle!: TextPlane;
  private hud!: TextPlane;
  private hudSub!: TextPlane;
  private buttons: LightButton[] = [];
  private creatures: Creature[] = [];
  private shadows: Record<Side, HandShadow> = { left: newShadow(), right: newShadow() };

  private phase: Phase = 'waiting';
  private phaseTime = 0;
  private clock = 0;
  private dim = 0;
  private dimTarget = 0;
  private reveal = 0;
  private revealTarget = 0;
  private paused = false;
  private wallSearchTime = 0;
  private readonly gazeHit = new Vector3();
  private gazeWall: { center: Vector3; normal: Vector3; halfW: number; halfH: number; hitValid: boolean } | null = null;
  private beatIndex = -1;
  private beatTime = 0;
  private assistShown = false;
  private reflection = false;
  private reflectionAlpha = 0;
  private roarGesture = false;
  private hintTimer = 0;
  private hintIndex = 0;
  private toastTime = 0;
  private handsLostShown = false;
  private wallDistance = 2.2;
  /** Focal point of the magic lantern: behind the lantern along the wall normal. */
  private readonly projector = new Vector3();
  /** The anchor holding the stage on the wall, and one being restored. */
  private stageAnchor: XRAnchor | null = null;
  private restoring: XRAnchor | null = null;
  private restoreFailed = false;
  private restoredStage = false;

  private readonly tmpV = new Vector3();
  private readonly tmpV2 = new Vector3();
  private readonly headPos = new Vector3();
  private readonly headFwd = new Vector3();
  private readonly headUp = new Vector3();
  private readonly proj: Projected = { x: 0, y: 0, scale: 1, depth: 0.5, valid: false };
  private readonly playerMatrix = new Matrix4();

  init(): void {
    this.layer = new ShadowLayer(1024);
    this.stage = new Stage(this.layer);
    this.lantern = new Lantern();
    this.scenery = new Scenery();
    this.hands = new Hands();
    this.sound = new Sound();
    this.save = new Save();
    void loadFonts();

    this.dimmer = new Mesh(
      new SphereGeometry(7, 24, 12),
      new MeshBasicMaterial({ color: 0x050302, side: BackSide, transparent: true, opacity: 0, depthWrite: false, depthTest: false }),
    );
    this.dimmer.renderOrder = 1;
    this.dimmer.frustumCulled = false;
    this.dimmer.name = 'ChhayaDimmer';

    this.reticle = new Mesh(
      new RingGeometry(0.06, 0.075, 48),
      new MeshBasicMaterial({ color: 0xffb866, transparent: true, opacity: 0, blending: AdditiveBlending, depthTest: false, depthWrite: false }),
    );
    this.reticle.renderOrder = 40;
    this.reticle.visible = false;

    this.narration = new TextPlane('narration', 1.9, 2048, 320);
    this.instruction = new TextPlane('instruction', 1.7, 2048, 128);
    this.title = new TextPlane('title', 1.6, 2048, 340);
    this.subtitle = new TextPlane('subtitle', 1.3, 2048, 150);
    this.hud = new TextPlane('narration', 1.0, 2048, 320);
    this.hudSub = new TextPlane('instruction', 0.9, 2048, 128);

    const add = (o: Mesh | import('@iwsdk/core').Object3D) => this.world.createTransformEntity(o);
    add(this.dimmer);
    add(this.stage.mesh);
    add(this.lantern.group);
    add(this.reticle);
    for (const t of [this.narration, this.instruction, this.title, this.subtitle, this.hud, this.hudSub]) add(t.mesh);

    const mk = (label: string, id: string) => {
      const b = new LightButton(label, id);
      add(b.group);
      add(b.label.mesh);
      this.buttons.push(b);
      return b;
    };
    mk('Hear a tale', 'tale');
    mk('Open stage', 'open');
    mk('Curtain', 'curtain');
    mk('Tell it again', 'again');
    mk('Move stage', 'move');

    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((v) => this.onVisibility(v)),
    );
    const enter = () => this.sound.start();
    window.addEventListener('chhaya:enter', enter);
    this.cleanupFuncs.push(() => window.removeEventListener('chhaya:enter', enter));
    (window as any).__chhaya = { state: theaterState, system: this };
    if (import.meta.env.DEV) {
      setInterval(() => {
        if (this.phase === 'waiting') return;
        console.info('[chhaya] state', JSON.stringify({ ...theaterState, dim: +this.dim.toFixed(2), head: this.headPos.toArray().map((v) => +v.toFixed(2)), lantern: this.lantern.light.toArray().map((v) => +v.toFixed(2)), hands: this.hands.both.map((h) => h.tracked ? `${h.reading?.species ?? '-'}:${h.stillFor.toFixed(1)}` : 'x') }));
      }, 2000);
    }
  }

  // ───────────────────────────── lifecycle ─────────────────────────────

  private onVisibility(v: VisibilityState): void {
    if (v === VisibilityState.NonImmersive) {
      this.endShow();
      return;
    }
    if (this.phase === 'waiting') this.startShow();
    this.paused = v !== VisibilityState.Visible;
    this.sound.setPaused(this.paused);
  }

  private startShow(): void {
    this.save.beginVisit();
    this.creatures = [];
    this.stage.placed = false;
    this.stage.mesh.visible = false;
    this.lantern.group.visible = false;
    this.reveal = 0;
    this.scenery.forestTarget = 0;
    this.scenery.wellTarget = 0;
    this.sound.start();
    this.sound.drone(0.7);
    // Entering from the browser's own XR button may leave audio suspended;
    // the first pinch is a user gesture that can resume it.
    const session = this.world.session;
    if (session) {
      const resume = () => this.sound.start();
      session.addEventListener('selectstart', resume);
      session.addEventListener('end', () => session.removeEventListener('selectstart', resume), { once: true });
    }
    this.stageAnchor = null;
    this.restoring = null;
    this.restoreFailed = false;
    this.beginRestore();
    this.setPhase('dim');
    window.dispatchEvent(new CustomEvent('chhaya:session', { detail: { active: true } }));
  }

  private endShow(): void {
    if (this.phase === 'waiting') return;
    this.sound.drone(0);
    this.sound.awakening(-1);
    this.setPhase('waiting');
    for (const t of [this.narration, this.instruction, this.title, this.subtitle, this.hud, this.hudSub]) t.hide();
    for (const b of this.buttons) b.enabled = false;
    window.dispatchEvent(
      new CustomEvent('chhaya:session', {
        detail: { active: false, discovered: this.save.data.discovered.length, total: ALL_SPECIES.length },
      }),
    );
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
    theaterState.phase = p;
    if (import.meta.env.DEV) console.info('[chhaya] phase', p);
    for (const b of this.buttons) b.enabled = false;
    switch (p) {
      case 'dim':
        this.dimTarget = 0.62;
        this.revealTarget = 0;
        this.hud.show(this.save.data.visits > 1 ? 'Welcome back to the theater.' : 'The lights go down…');
        break;
      case 'wall':
        this.wallSearchTime = 0;
        this.hud.show('Look at a wall to be your stage,\nthen pinch.');
        this.hudSub.show('Thumb and index finger together');
        break;
      case 'curtain':
        this.hud.hide();
        this.hudSub.hide();
        this.revealTarget = 1;
        this.title.show('Chhaya');
        this.subtitle.show(this.restoredStage ? 'your stage is where you left it' : 'a shadow theater for your hands');
        this.sound.chime(0.5, null, 0.25);
        break;
      case 'first-light':
        this.title.hide();
        this.subtitle.hide();
        this.narration.show('Raise a hand between the lantern and the wall.');
        this.instruction.hide();
        break;
      case 'first-shape':
        this.narration.show('Every shape you hold still comes alive.');
        this.instruction.show('Try two fingers up for ears, then hold still');
        break;
      case 'menu': {
        this.title.hide();
        this.subtitle.hide();
        this.scenery.forestTarget = 0;
        this.scenery.wellTarget = 0;
        const n = this.save.discoveredCount;
        this.narration.show(n > 0 ? `Your theater has met ${n} of ${ALL_SPECIES.length} shadows.` : 'What shall we play?');
        this.instruction.show('Cover a light with your hand’s shadow to choose');
        this.placeButtons(['tale', 'open', 'move']);
        break;
      }
      case 'tale':
        this.beatIndex = -1;
        this.title.show(LION_AND_HARE.title);
        this.subtitle.show(LION_AND_HARE.byline);
        this.narration.hide();
        this.instruction.hide();
        this.nextBeat();
        break;
      case 'tale-end':
        this.save.finishTale(LION_AND_HARE.id);
        this.title.show('The End');
        this.narration.hide();
        this.instruction.show('Cover a light to choose');
        this.placeButtons(['again', 'open']);
        break;
      case 'open':
        this.title.hide();
        this.subtitle.hide();
        this.scenery.forestTarget = 1;
        this.narration.show('The stage is yours.');
        this.instruction.show(this.nextHint());
        this.hintTimer = 9;
        this.placeButtons(['curtain']);
        break;
      default:
        break;
    }
  }

  // ─────────────────────────────── frame ───────────────────────────────

  update(delta: number): void {
    const dt = Math.min(0.05, delta);
    this.clock += dt;
    if (this.phase === 'waiting') return;

    const head = this.player.head;
    head.updateWorldMatrix(true, false);
    this.headPos.setFromMatrixPosition(head.matrixWorld);
    this.headFwd.set(0, 0, -1).transformDirection(head.matrixWorld);
    this.headUp.set(0, 1, 0).transformDirection(head.matrixWorld);
    this.sound.updateListener(this.headPos, this.headFwd, this.headUp);
    if (this.paused) return;

    this.phaseTime += dt;
    this.player.updateWorldMatrix(true, false);
    this.playerMatrix.copy(this.player.matrixWorld);
    this.hands.update(this.world.session, this.world.xrFrame, this.world.xrReferenceSpace, this.playerMatrix, dt);
    this.sound.tick(dt);

    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 1.2);
    (this.dimmer.material as MeshBasicMaterial).opacity = this.dim;
    this.dimmer.position.copy(this.headPos);
    this.reveal += Math.sign(this.revealTarget - this.reveal) * Math.min(Math.abs(this.revealTarget - this.reveal), dt * 0.45);

    this.updateLanternGrab();
    this.lantern.update(dt, 0.25 + 0.75 * Math.max(this.reveal, this.phase === 'wall' ? 0.6 : 0));

    if (this.stage.placed) {
      this.updateProjector();
      this.projectHands();
    }
    this.roarGesture = false;
    for (const h of this.hands.both) if (h.tracked && (h.burst || h.pinchStarted)) this.roarGesture = true;

    this.runPhase(dt);

    if (this.stage.placed) {
      this.updateCreatures(dt);
      this.scenery.update(dt);
      this.renderShadows();
      this.stage.updateLight(this.projector, this.lantern.intensity, this.reveal, this.clock);
    }
    this.updateTexts(dt);
    theaterState.creatures = this.creatures.length;
    theaterState.stagePlaced = this.stage.placed;
    theaterState.paper = this.stage.paper;
    theaterState.beat = this.beatIndex;
  }

  private runPhase(dt: number): void {
    switch (this.phase) {
      case 'dim':
        this.followHud();
        if (this.phaseTime > 2.2) {
          // Give a saved stage a few seconds to be found in the room.
          if (this.tryRestoreStage()) break;
          if (this.restoreFailed || this.phaseTime > 6) this.setPhase('wall');
        }
        break;
      case 'wall':
        this.followHud();
        this.chooseWall(dt);
        break;
      case 'curtain':
        if (this.phaseTime > 4.2) this.setPhase(this.save.data.tutorialDone ? 'menu' : 'first-light');
        break;
      case 'first-light': {
        const onStage = this.hands.both.some((h) => h.tracked && this.shadows[h.side].valid && this.shadowOnStage(this.shadows[h.side]));
        if (onStage && this.phaseTime > 1.5) {
          this.hintTimer += dt;
          if (this.hintTimer > 2) {
            this.hintTimer = 0;
            this.setPhase('first-shape');
          }
        }
        this.awakenShapes(dt);
        break;
      }
      case 'first-shape':
        this.awakenShapes(dt);
        if (this.creatures.length > 0 && this.phaseTime > 1) {
          if (this.toastTime <= 0 && this.phaseTime > 6) {
            this.save.setTutorialDone();
            this.setPhase('menu');
          }
        }
        if (this.phaseTime > 40 && this.creatures.length === 0) {
          this.instruction.show('Or pinch, and the lantern will shape one for you');
          if (this.hands.both.some((h) => h.pinchStarted)) this.summon('hare', this.stage.width * 0.5);
        }
        break;
      case 'menu':
      case 'tale-end':
        this.awakenShapes(dt);
        this.handleButtons(dt);
        break;
      case 'open':
        this.awakenShapes(dt);
        this.handleButtons(dt);
        this.hintTimer -= dt;
        if (this.hintTimer <= 0 && this.toastTime <= 0) {
          this.instruction.show(this.nextHint());
          this.hintTimer = 10;
        }
        break;
      case 'tale':
        this.awakenShapes(dt);
        this.runTale(dt);
        break;
      default:
        break;
    }
    if (this.toastTime > 0) this.toastTime -= dt;

    // Tracking loss: a quiet prompt, never a hard stop.
    const interactive = this.phase !== 'dim' && this.phase !== 'curtain';
    if (interactive && !this.hands.anyTracked && this.hands.left.lostFor > 2.5 && this.hands.right.lostFor > 2.5) {
      if (!this.handsLostShown) {
        this.handsLostShown = true;
        this.instruction.show('Show your hands to the lantern');
      }
    } else if (this.handsLostShown && this.hands.anyTracked) {
      this.handsLostShown = false;
      this.instruction.hide();
    }
  }

  // ─────────────────────────────── walls ───────────────────────────────

  private followHud(): void {
    const fwd = this.tmpV.copy(this.headFwd).setY(0);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    const target = this.tmpV2.copy(this.headPos).addScaledVector(fwd, 1.25);
    target.y = this.headPos.y - 0.08;
    const k = this.phaseTime < 0.1 ? 1 : 0.06;
    this.hud.mesh.position.lerp(target, k);
    this.hud.mesh.lookAt(this.headPos);
    this.hudSub.mesh.position.copy(this.hud.mesh.position).y -= 0.15;
    this.hudSub.mesh.quaternion.copy(this.hud.mesh.quaternion);
  }

  /** Ask the browser for the stage anchor saved on a previous visit. */
  private beginRestore(): void {
    const record = this.save.data.stageAnchor;
    const session = this.world.session as (XRSession & { restorePersistentAnchor?: (uuid: string) => Promise<XRAnchor> }) | undefined;
    if (!record || !session?.restorePersistentAnchor) {
      this.restoreFailed = true;
      return;
    }
    session.restorePersistentAnchor(record.uuid).then(
      (anchor) => {
        this.restoring = anchor;
      },
      () => {
        this.restoreFailed = true;
        this.save.setStageAnchor(null);
      },
    );
  }

  /** Place the stage from a restored anchor once it has a pose. */
  private tryRestoreStage(): boolean {
    const record = this.save.data.stageAnchor;
    const frame = this.world.xrFrame;
    const ref = this.world.xrReferenceSpace;
    if (!record || !this.restoring || !frame || !ref) return false;
    const pose = frame.getPose(this.restoring.anchorSpace, ref);
    if (!pose) return false;
    const m = new Matrix4().fromArray(pose.transform.matrix as unknown as number[]).premultiply(this.playerMatrix);
    const center = new Vector3().setFromMatrixPosition(m);
    const normal = new Vector3(0, 0, 1).transformDirection(m);
    this.stageAnchor = this.restoring;
    this.restoring = null;
    this.placeLantern(normal.clone().negate());
    this.stage.setFrame({ center, normal, width: record.width, height: record.height, paper: record.paper });
    this.wallDistance = Math.max(0.8, this.stage.heightAbove(this.headPos));
    this.restoredStage = true;
    this.afterStagePlaced(false);
    return true;
  }

  /** Anchor the stage to the room and ask for a handle that survives visits. */
  private anchorStage(): void {
    const frame = this.world.xrFrame as (XRFrame & { createAnchor?: (t: XRRigidTransform, s: XRSpace) => Promise<XRAnchor> }) | null;
    const ref = this.world.xrReferenceSpace;
    if (!frame?.createAnchor || !ref || typeof XRRigidTransform === 'undefined') return;
    const p = this.stage.center;
    const q = this.stage.mesh.quaternion;
    const record = { width: this.stage.width, height: this.stage.height, paper: this.stage.paper };
    const old = this.save.data.stageAnchor;
    frame.createAnchor(new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w }), ref).then(
      async (anchor) => {
        this.stageAnchor = anchor;
        const persistent = anchor as XRAnchor & { requestPersistentHandle?: () => Promise<string> };
        if (!persistent.requestPersistentHandle) return;
        const uuid = await persistent.requestPersistentHandle();
        this.save.setStageAnchor({ uuid, ...record });
        const session = this.world.session as (XRSession & { deletePersistentAnchor?: (uuid: string) => Promise<void> }) | undefined;
        if (old && old.uuid !== uuid) void session?.deletePersistentAnchor?.(old.uuid).catch(() => undefined);
      },
      () => undefined,
    );
  }

  /** Forget the saved stage and choose a wall again. */
  private moveStage(): void {
    const old = this.save.data.stageAnchor;
    const session = this.world.session as (XRSession & { deletePersistentAnchor?: (uuid: string) => Promise<void> }) | undefined;
    if (old) void session?.deletePersistentAnchor?.(old.uuid).catch(() => undefined);
    this.stageAnchor?.delete?.();
    this.stageAnchor = null;
    this.save.setStageAnchor(null);
    for (const c of this.creatures) c.leave(c.x < this.stage.width / 2 ? -1 : 1);
    this.creatures = [];
    this.stage.placed = false;
    this.stage.mesh.visible = false;
    this.lantern.group.visible = false;
    this.reveal = 0;
    this.revealTarget = 0;
    this.narration.hide();
    this.instruction.hide();
    this.setPhase('wall');
  }

  private chooseWall(dt: number): void {
    this.wallSearchTime += dt;
    const frame = this.world.xrFrame;
    const ref = this.world.xrReferenceSpace;
    let best: TheaterSystem['gazeWall'] = null;
    let bestT = Infinity;
    const planes = (frame as any)?.detectedPlanes as Set<XRPlane> | undefined;
    if (frame && ref && planes) {
      for (const plane of planes) {
        if (plane.orientation !== 'vertical') continue;
        // Real walls only: wall art, windows and doors are planes of their own.
        const label = (plane as XRPlane & { semanticLabel?: string }).semanticLabel?.toLowerCase();
        if (label && label !== 'wall' && label !== 'wall_face' && label !== 'other') continue;
        const pose = frame.getPose(plane.planeSpace, ref);
        if (!pose) continue;
        const m = new Matrix4().fromArray(pose.transform.matrix as unknown as number[]).premultiply(this.playerMatrix);
        const normal = new Vector3(0, 1, 0).transformDirection(m).setY(0);
        if (normal.lengthSq() < 0.5) continue;
        normal.normalize();
        const origin = new Vector3().setFromMatrixPosition(m);
        if (normal.dot(this.tmpV.subVectors(this.headPos, origin)) < 0) normal.negate();
        // Polygon extents in wall axes.
        const right = new Vector3().crossVectors(new Vector3(0, 1, 0), normal).normalize();
        let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity;
        for (const p of plane.polygon) {
          const w = new Vector3(p.x, p.y, p.z).applyMatrix4(m).sub(origin);
          const r = w.dot(right);
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minU = Math.min(minU, w.y);
          maxU = Math.max(maxU, w.y);
        }
        if (!(maxR - minR > (label === 'wall' ? 0.8 : 1.2)) || !(maxU - minU > 0.8)) continue;
        const center = origin.clone().addScaledVector(right, (minR + maxR) / 2);
        center.y += (minU + maxU) / 2;
        const denom = this.headFwd.dot(normal);
        if (denom > -0.15) continue;
        const t = this.tmpV.subVectors(center, this.headPos).dot(normal) / denom;
        if (t < 0.6 || t > 6) continue;
        const hit = this.tmpV2.copy(this.headPos).addScaledVector(this.headFwd, t);
        const local = hit.clone().sub(center);
        const hr = local.dot(right);
        const halfW = (maxR - minR) / 2;
        const halfH = (maxU - minU) / 2;
        const inside = Math.abs(hr) < halfW + 0.2 && Math.abs(local.y) < halfH + 0.3;
        if (inside && t < bestT) {
          bestT = t;
          best = { center, normal, halfW, halfH, hitValid: true };
          this.gazeHit.copy(hit);
        }
      }
    }
    this.gazeWall = best;
    const mat = this.reticle.material as MeshBasicMaterial;
    if (best) {
      this.reticle.visible = true;
      this.reticle.position.copy(this.gazeHit).addScaledVector(best.normal, 0.01);
      this.reticle.lookAt(this.tmpV.copy(this.reticle.position).add(best.normal));
      const s = 1 + 0.08 * Math.sin(this.clock * 4);
      this.reticle.scale.setScalar(s * Math.max(1, bestT / 1.6));
      mat.opacity = Math.min(1, mat.opacity + dt * 3);
      this.hud.show('Pinch to raise the curtain on this wall.');
    } else {
      mat.opacity = Math.max(0, mat.opacity - dt * 3);
      if (mat.opacity <= 0) this.reticle.visible = false;
      if (this.wallSearchTime > 3) {
        this.hud.show('No wall in view? Pinch to hang\na paper screen in front of you.');
      }
    }

    const pinched = this.hands.both.some((h) => h.pinchStarted);
    if (!pinched || this.phaseTime < 0.8) return;
    if (best) this.placeStageOnWall(best, bestT);
    else if (this.wallSearchTime > 1.2) this.placePaperScreen();
  }

  private placeStageOnWall(wall: NonNullable<TheaterSystem['gazeWall']>, distance: number): void {
    const toWall = wall.normal.clone().negate();
    this.placeLantern(toWall);
    const width = Math.min(Math.max(0.95 * distance, 1.3), 3.4, Math.max(1.0, wall.halfW * 2 - 0.1));
    const height = Math.min(width * 0.625, Math.max(0.7, wall.halfH * 2 - 0.2));
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), wall.normal).normalize();
    // Centre the stage where the lantern throws a hand held naturally in
    // front of you (half a metre out, a little below the eyes), so the first
    // shadow lands in the middle of the stage without any searching.
    const hand = this.headPos.clone().addScaledVector(toWall, 0.5);
    hand.y -= 0.1;
    const d0 = Math.max(0.5, distance - 0.2);
    const light = this.lantern.light.clone().addScaledVector(wall.normal, Math.max(0, (d0 - 1.02) / 2.4));
    const dir = hand.sub(light);
    const denom = dir.dot(wall.normal);
    const center = this.gazeHit.clone();
    if (denom < -1e-3) {
      const t = this.tmpV.subVectors(wall.center, light).dot(wall.normal) / denom;
      center.copy(light).addScaledVector(dir, t);
    }
    const along = this.tmpV.subVectors(center, wall.center).dot(right);
    const maxAlong = Math.max(0, wall.halfW - width / 2);
    center.addScaledVector(right, Math.max(-maxAlong, Math.min(maxAlong, along)) - along);
    const minY = wall.center.y - wall.halfH + height / 2 + 0.08;
    const maxY = wall.center.y + wall.halfH - height / 2 - 0.05;
    center.y = Math.min(Math.max(center.y, minY), Math.max(minY, maxY));
    this.stage.setFrame({ center, normal: wall.normal, width, height, paper: false });
    this.wallDistance = distance;
    this.afterStagePlaced();
  }

  private placePaperScreen(): void {
    const fwd = this.tmpV.copy(this.headFwd).setY(0).normalize();
    this.placeLantern(fwd.clone());
    const center = this.headPos.clone().addScaledVector(fwd, 1.7);
    center.y = this.headPos.y - 0.12;
    const normal = fwd.clone().negate();
    this.stage.setFrame({ center, normal, width: 1.6, height: 1.0, paper: true });
    this.wallDistance = 1.7;
    this.afterStagePlaced();
  }

  /** Lantern: just below the line of sight and a little to the side, within reach. */
  private placeLantern(toWall: Vector3): void {
    const side = new Vector3().crossVectors(toWall, new Vector3(0, 1, 0)).normalize();
    this.lantern.position.copy(this.headPos).addScaledVector(toWall, 0.24).addScaledVector(side, 0.1);
    this.lantern.position.y = this.headPos.y - 0.24;
  }

  private afterStagePlaced(isNew = true): void {
    if (isNew) {
      this.restoredStage = false;
      this.anchorStage();
    }
    this.reticle.visible = false;
    this.sound.tock();
    this.lantern.group.visible = true;
    this.scenery.layout(this.stage.width, this.stage.height);
    this.layoutWallText();
    this.setPhase('curtain');
  }

  private layoutWallText(): void {
    const s = this.stage;
    const q = s.mesh.quaternion;
    // Keep text at a constant angular size whatever the wall distance.
    const scale = Math.max(0.8, this.wallDistance / 2.2);
    const put = (t: TextPlane, x: number, y: number, w: number) => {
      t.setWidth(w);
      s.toWorld(x, y, 0.012, t.mesh.position);
      t.mesh.quaternion.copy(q);
    };
    put(this.narration, s.width / 2, -0.17 * scale, 1.9 * scale);
    put(this.instruction, s.width / 2, -0.34 * scale, 1.7 * scale);
    put(this.title, s.width / 2, s.height * 0.58, 1.6 * scale);
    put(this.subtitle, s.width / 2, s.height * 0.4, 1.2 * scale);
  }

  private placeButtons(ids: string[]): void {
    const s = this.stage;
    const k = Math.max(0.8, this.wallDistance / 2.2);
    const main = ids.filter((id) => id !== 'curtain' && id !== 'move');
    const corner = ids.filter((id) => id === 'curtain' || id === 'move');
    const put = (id: string, x: number, y: number, small: boolean) => {
      const b = this.buttons.find((x) => x.id === id)!;
      b.x = x;
      b.y = y;
      b.radius = (small ? 0.07 : 0.12) * k;
      const d = b.radius * 2.4;
      s.toWorld(x, y, 0.014, b.group.position);
      b.group.quaternion.copy(s.mesh.quaternion);
      b.group.scale.set(d, d, 1);
      b.label.setWidth((small ? 0.36 : 0.62) * k);
      s.toWorld(x, y - b.radius - (small ? 0.045 : 0.07) * k, 0.014, b.label.mesh.position);
      b.label.mesh.quaternion.copy(s.mesh.quaternion);
      b.enabled = true;
      b.progress = 0;
    };
    main.forEach((id, i) => put(id, s.width * (main.length === 1 ? 0.5 : 0.3 + 0.4 * i), s.height * 0.56, false));
    corner.forEach((id) => put(id, s.width - 0.22 * k, s.height - 0.2 * k, true));
  }

  private handleButtons(dt: number): void {
    for (const b of this.buttons) {
      b.covered = false;
      if (!b.enabled) continue;
      for (const h of this.hands.both) {
        const sh = this.shadows[h.side];
        if (h.tracked && sh.valid && this.covers(sh, b.x, b.y, b.radius * 0.5)) {
          b.covered = true;
          if (h.pinchStarted) b.progress = 1;
        }
      }
    }
    for (const b of this.buttons) {
      const fired = b.update(dt, this.clock) || (b.enabled && b.progress >= 1);
      if (fired && b.enabled) {
        b.progress = 0;
        // The hand that pressed must move before it can wake a creature.
        this.shadows.left.locked = true;
        this.shadows.right.locked = true;
        this.sound.chime(1.5, null, 0.15);
        this.onButton(b.id);
        return;
      }
    }
  }

  private onButton(id: string): void {
    switch (id) {
      case 'tale':
      case 'again':
        this.setPhase('tale');
        break;
      case 'open':
        this.setPhase('open');
        break;
      case 'curtain':
        this.clearStage();
        this.setPhase('menu');
        break;
      case 'move':
        this.moveStage();
        break;
    }
  }

  // ──────────────────────────── shadows & hands ────────────────────────────

  private updateLanternGrab(): void {
    let near = 0;
    for (const h of this.hands.both) {
      if (!h.tracked) continue;
      const d = h.pinchPoint.distanceTo(this.lantern.light);
      near = Math.max(near, 1 - Math.min(1, Math.max(0, (d - 0.07) / 0.12)));
      if (!this.lantern.group.visible) continue;
      if (h.pinchStarted && !this.lantern.grabbedBy && d < 0.1) {
        this.lantern.startGrab(h.side, h.pinchPoint);
        this.sound.tock();
      }
      if (this.lantern.grabbedBy === h.side) {
        if (h.pinching) this.lantern.moveGrab(h.pinchPoint);
        else this.lantern.endGrab();
      }
    }
    if (this.lantern.grabbedBy && !this.hands[this.lantern.grabbedBy].tracked) this.lantern.endGrab();
    // Keep the lantern on the audience's side of the wall.
    if (this.stage.placed) {
      const h = this.stage.heightAbove(this.lantern.light);
      if (h < 0.45) this.lantern.position.addScaledVector(this.stage.normal, 0.45 - h);
    }
    this.lantern.nearness = near;
  }

  /**
   * The lantern is a "magic lantern": its light is focused from a point
   * behind it, chosen so a hand ~30 cm in front of the lantern throws a shadow
   * about 3.4x its size on any wall. Closer to the lantern is still bigger and
   * softer; the focal distance just keeps far walls from blowing shadows up.
   */
  private updateProjector(): void {
    const d = Math.max(0.5, this.stage.heightAbove(this.lantern.light));
    const focal = Math.max(0, (d - 3.4 * 0.3) / 2.4);
    this.projector.copy(this.lantern.light).addScaledVector(this.stage.normal, focal);
  }

  private projectHands(): void {
    const light = this.projector;
    for (const h of this.hands.both) {
      const sh = this.shadows[h.side];
      sh.valid = false;
      if (!h.tracked) continue;
      let depthSum = 0;
      let n = 0;
      let ok = true;
      const scales = new Float32Array(POINT_COUNT);
      for (let i = 0; i < POINT_COUNT; i++) {
        h.point(i, this.tmpV);
        this.stage.project(light, this.tmpV, this.proj);
        if (!this.proj.valid) {
          if (i < 25) {
            ok = false;
            break;
          }
          // Elbow behind the lantern: tuck it under the wrist instead.
          sh.pts[i * 2] = sh.pts[0];
          sh.pts[i * 2 + 1] = sh.pts[1] - 0.2;
          scales[i] = scales[0];
          continue;
        }
        sh.pts[i * 2] = this.proj.x;
        sh.pts[i * 2 + 1] = this.proj.y;
        scales[i] = this.proj.scale;
        if (i < 25) {
          depthSum += this.proj.depth;
          n++;
        }
      }
      if (!ok) continue;
      HAND_BONES.forEach(([a, b, r], k) => {
        const base = r > 0 ? r : Math.max(h.radii[a], h.radii[b]) * 1.08;
        sh.radii[k] = base * (scales[a] + scales[b]) * 0.5;
      });
      sh.depth = depthSum / Math.max(1, n);
      sh.cx = sh.pts[25 * 2];
      sh.cy = sh.pts[25 * 2 + 1];
      sh.valid = true;
    }
  }

  private shadowOnStage(sh: HandShadow): boolean {
    return this.stage.contains(sh.cx, sh.cy, -0.05);
  }

  /** Does a hand's shadow cover a stage point (within `pad`)? */
  private covers(sh: HandShadow, x: number, y: number, pad = 0): boolean {
    for (let k = 0; k < HAND_BONES.length; k++) {
      const [a, b, , arm] = HAND_BONES[k];
      if (arm) continue;
      const ax = sh.pts[a * 2], ay = sh.pts[a * 2 + 1];
      const bx = sh.pts[b * 2], by = sh.pts[b * 2 + 1];
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
      if (d < sh.radii[k] + pad) return true;
    }
    return false;
  }

  private awakenShapes(dt: number): void {
    let strongest = 0;
    for (const h of this.hands.both) {
      const sh = this.shadows[h.side];
      if (!h.tracked || !sh.valid || h.pinching || sh.carrying || this.lantern.grabbedBy === h.side) {
        sh.awaken = 0;
        continue;
      }
      if (sh.locked) {
        if (h.speed > 0.18 || h.steadySpecies === null) sh.locked = false;
        sh.awaken = 0;
        continue;
      }
      // A hand pressing a light button is choosing, not performing.
      if (this.buttons.some((b) => b.enabled && this.covers(sh, b.x, b.y, b.radius))) {
        sh.awaken = 0;
        continue;
      }
      const onStage = this.shadowOnStage(sh);
      const species = h.steadySpecies;
      const reading = h.reading;
      const wispLike = !species && reading !== null && reading.openness < 0.72 && reading.pinchGap > 0.03;
      if (onStage && h.stillFor > 0.25 && (species || wispLike)) {
        sh.awaken += dt / (species ? AWAKEN_SECONDS : WISP_SECONDS);
      } else {
        sh.awaken = Math.max(0, sh.awaken - dt * 2.5);
      }
      if (sh.awaken >= 1) {
        sh.awaken = 0;
        sh.locked = true;
        this.spawnFromShadow(sh, species ?? 'wisp');
      }
      strongest = Math.max(strongest, sh.awaken);
    }
    this.sound.awakening(strongest > 0.05 ? strongest : -1);
  }

  private ground(): Ground {
    return { y: this.scenery.groundY, minX: 0.08, maxX: this.stage.width - 0.08, unit: this.scenery.unit };
  }

  private spawnFromShadow(sh: HandShadow, species: Species): Creature {
    const c = new Creature(species, sh.pts, sh.radii, sh.depth, this.ground());
    return this.addCreature(c);
  }

  private addCreature(c: Creature): Creature {
    this.creatures.push(c);
    const living = this.creatures.filter((x) => x.state !== 'leaving' && x.state !== 'gone' && x.state !== 'leaping');
    if (living.length > MAX_CREATURES) living[0].leave(living[0].x < this.stage.width / 2 ? -1 : 1);
    this.sound.call(c.species, this.stage.toWorld(c.x, 0.4, 0, this.tmpV));
    const isNew = this.save.discover(c.species);
    if (this.phase !== 'tale') {
      const info = SPECIES_INFO[c.species];
      const found = this.save.discoveredCount;
      this.instruction.show(isNew ? `A ${info.name.toLowerCase()}! ${found} of ${ALL_SPECIES.length} shadows found` : `A ${info.name.toLowerCase()}`);
      this.toastTime = 3.5;
      if (isNew) this.sound.chime(2, null, 0.12);
    }
    return c;
  }

  /** Summon a creature from its canonical silhouette (assist / accessibility). */
  summon(species: Species, x: number): Creature {
    const shape = (canonical as Record<string, { points: number[]; radii: number[] }>)[species];
    const k = 2.4;
    const pts = new Float32Array(POINT_COUNT * 2);
    for (let i = 0; i < POINT_COUNT; i++) {
      pts[i * 2] = x + shape.points[i * 2] * k;
      pts[i * 2 + 1] = this.stage.height * 0.45 + shape.points[i * 2 + 1] * k;
    }
    const radii = new Float32Array(HAND_BONES.length);
    HAND_BONES.forEach(([a, b, r], i) => {
      radii[i] = (r > 0 ? r : Math.max(shape.radii[a], shape.radii[b]) * 1.08) * k;
    });
    return this.addCreature(new Creature(species, pts, radii, 0.55, this.ground()));
  }

  private updateCreatures(dt: number): void {
    const ground = this.ground();
    // Carrying: pinch a creature's shadow through your hand's shadow.
    for (const h of this.hands.both) {
      const sh = this.shadows[h.side];
      if (h.pinchStarted && sh.valid && this.lantern.grabbedBy !== h.side) {
        h.point(4, this.tmpV).add(h.point(9, this.tmpV2)).multiplyScalar(0.5);
        this.stage.project(this.projector, this.tmpV, this.proj);
        if (this.proj.valid) {
          let pick: Creature | null = null;
          for (let i = this.creatures.length - 1; i >= 0; i--) {
            const c = this.creatures[i];
            if (c.canBeCarried && c.hit(this.proj.x, this.proj.y, 0.06)) {
              pick = c;
              break;
            }
          }
          if (pick) {
            pick.pickUp();
            sh.carrying = pick;
            sh.carryDx = pick.x - this.proj.x;
            sh.carryDy = pick.y - this.proj.y;
            this.sound.hop(this.stage.toWorld(pick.x, pick.y, 0, this.tmpV2));
          }
        }
      }
      if (sh.carrying) {
        const c = sh.carrying;
        if (!h.pinching || !h.tracked || c.state !== 'carried') {
          c.drop();
          if (c.x < -0.05 || c.x > this.stage.width + 0.05) c.leave(c.x < 0 ? -1 : 1);
          sh.carrying = null;
        } else {
          h.point(4, this.tmpV).add(h.point(9, this.tmpV2)).multiplyScalar(0.5);
          this.stage.project(this.projector, this.tmpV, this.proj);
          if (this.proj.valid) {
            c.carryX = this.proj.x + sh.carryDx;
            c.carryY = Math.max(ground.y, this.proj.y + sh.carryDy);
          }
        }
      }
      // Petting: brushing a creature with your shadow makes it hop.
      if (sh.valid && !h.pinching && h.speed > 0.12) {
        for (const c of this.creatures) {
          if (c.state === 'idle' || c.state === 'walking') {
            if (this.covers(sh, c.x, c.centerY, c.halfWidth * 0.4)) c.nudge();
          }
        }
      }
    }
    const calm = this.phase === 'tale';
    for (const c of this.creatures) {
      c.calm = calm;
      c.update(dt, ground);
    }
    this.creatures = this.creatures.filter((c) => c.alive);
    this.reflectionAlpha += ((this.reflection ? 1 : 0) - this.reflectionAlpha) * Math.min(1, dt * 2);
  }

  private renderShadows(): void {
    const layer = this.layer;
    layer.begin();
    this.scenery.emit(layer);
    if (this.reflectionAlpha > 0.01) {
      const lion = this.creatures.find((c) => c.species === 'lion');
      const cx = this.scenery.wellX;
      const cy = this.stage.height * 0.72;
      const u = this.scenery.unit;
      this.scenery.emitWaterRing(layer, cx, cy, 0.16 * u, this.reflectionAlpha);
      if (lion) lion.emitMirror(layer, cx, cy, 0.42 * u * this.reflectionAlpha, this.clock);
    }
    for (const c of this.creatures) c.emit(layer);
    for (const h of this.hands.both) {
      const sh = this.shadows[h.side];
      if (!h.tracked || !sh.valid) continue;
      const ember = sh.awaken;
      HAND_BONES.forEach(([a, b], k) => {
        layer.push(sh.pts[a * 2], sh.pts[a * 2 + 1], sh.pts[b * 2], sh.pts[b * 2 + 1], sh.radii[k], sh.depth, ember);
      });
    }
    layer.render(this.world.renderer);
  }

  private updateTexts(dt: number): void {
    for (const t of [this.narration, this.instruction, this.title, this.subtitle, this.hud, this.hudSub]) t.update(dt);
    if (this.phase !== 'menu' && this.phase !== 'open' && this.phase !== 'tale-end') {
      for (const b of this.buttons) b.update(dt, this.clock);
    }
  }

  private nextHint(): string {
    const missing = ALL_SPECIES.filter((s) => !this.save.data.discovered.includes(s));
    const pool = missing.length > 0 ? missing : ALL_SPECIES;
    const s = pool[this.hintIndex++ % pool.length];
    const info = SPECIES_INFO[s];
    return missing.length > 0 ? `Undiscovered: ${info.hint.toLowerCase()}` : `All ${ALL_SPECIES.length} shadows found. ${info.hint}`;
  }

  /** Dev/test helper: where to hold a palm so its shadow lands on stage (x, y). */
  debugAim(x: number, y: number, fromLantern = 0.3): number[] {
    const wall = this.stage.toWorld(x, y, 0, new Vector3());
    const c = this.projector;
    const target = this.stage.heightAbove(this.lantern.light) - fromLantern;
    const t = (this.stage.heightAbove(c) - target) / Math.max(1e-3, this.stage.heightAbove(c));
    return wall.sub(c).multiplyScalar(t).add(c).toArray();
  }

  /** Dev/test helper: where each creature stands. */
  debugCreatures(): { s: string; x: number; y: number; st: string }[] {
    return this.creatures.map((c) => ({ s: c.species, x: +c.x.toFixed(2), y: +c.centerY.toFixed(2), st: c.state }));
  }

  /** Dev/test helper: stage coordinates of the visible buttons. */
  debugButtons(): { id: string; x: number; y: number }[] {
    return this.buttons.filter((b) => b.enabled).map((b) => ({ id: b.id, x: b.x, y: b.y }));
  }

  // ─────────────────────────────── the tale ───────────────────────────────

  private taleContext(): TaleContext {
    const self = this;
    return {
      get time() {
        return self.clock;
      },
      get width() {
        return self.stage.width;
      },
      get ground() {
        return self.ground();
      },
      find: (s) => this.creatures.find((c) => c.species === s && c.state !== 'leaving' && c.state !== 'gone'),
      others: (...ex) => this.creatures.filter((c) => !ex.includes(c.species) && c.state !== 'leaving' && c.state !== 'gone'),
      summon: (s, x) => this.summon(s, x),
      get roarGesture() {
        return self.roarGesture;
      },
      setForest: (on) => (this.scenery.forestTarget = on ? 1 : 0),
      setWell: (on) => (this.scenery.wellTarget = on ? 1 : 0),
      get wellX() {
        return self.scenery.wellX;
      },
      showReflection: (on) => (this.reflection = on),
      roar: (c, echo) => {
        if (!echo) c.roar();
        this.sound.roar(this.stage.toWorld(c.x, 0.3, 0, this.tmpV), !!echo);
      },
      splash: () => this.sound.splash(this.stage.toWorld(this.scenery.wellX, 0.2, 0, this.tmpV)),
      celebrate: () => {
        for (const c of this.creatures) c.nudge();
        [1, 1.25, 1.5, 2].forEach((p, i) => setTimeout(() => this.sound.chime(p, null, 0.14), i * 220));
        const hare = this.creatures.find((c) => c.species === 'hare');
        hare?.goTo(this.stage.width * 0.5, this.ground());
      },
      clearStage: (except) => this.clearStage(except),
    };
  }

  private clearStage(except: Species[] = []): void {
    for (const c of this.creatures) if (!except.includes(c.species)) c.leave(c.x < this.stage.width / 2 ? -1 : 1);
  }

  private nextBeat(): void {
    this.beatIndex++;
    this.beatTime = 0;
    this.assistShown = false;
    const beat = this.currentBeat();
    if (!beat) {
      this.setPhase('tale-end');
      return;
    }
    if (this.beatIndex === 1) {
      this.title.hide();
      this.subtitle.hide();
    }
    beat.enter?.(this.taleContext());
    if (beat.narration) this.narration.show(beat.narration);
    if (beat.instruction) this.instruction.show(beat.instruction);
    else this.instruction.hide();
  }

  private currentBeat(): Beat | undefined {
    return LION_AND_HARE.beats[this.beatIndex];
  }

  private runTale(dt: number): void {
    const beat = this.currentBeat();
    if (!beat) return;
    this.beatTime += dt;
    const ctx = this.taleContext();
    const holdDone = this.beatTime >= (beat.hold ?? 0);
    const condition = beat.until ? beat.until(ctx) : true;
    if (holdDone && condition) {
      this.nextBeat();
      return;
    }
    if (beat.until && beat.assistAfter !== undefined && this.beatTime > beat.assistAfter && !condition) {
      if (!this.assistShown) {
        this.assistShown = true;
        if (beat.assistText) this.instruction.show(beat.assistText);
      }
      const pinched = this.hands.both.some((h) => h.pinchStarted && !this.shadows[h.side].carrying);
      // Pinch to accept the assist, or it happens by itself a little later.
      if (pinched || this.beatTime > beat.assistAfter + 18) {
        if (beat.skipOnAssist) {
          this.nextBeat();
          return;
        }
        beat.assist?.(ctx);
        this.assistShown = false;
        this.beatTime = beat.assistAfter - 6; // give the assist time to play out
      }
    }
  }
}
