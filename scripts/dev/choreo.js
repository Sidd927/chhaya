// Dev-only: in-page choreography for recording Chhaya in the IWER emulator.
// Evaluated inside the app frame by scripts/dev/film.mjs. Uses the emulator's
// device (window.IWER_DEVICE) and the app's dev hooks (window.__chhaya).
// Each segment returns when done; segments are kept under ~95 s each.
(async (segment) => {
  const dev = window.IWER_DEVICE;
  const chh = window.__chhaya;
  const sys = () => chh.system;
  const st = () => chh.state;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const R = dev.hands.right;
  const L = dev.hands.left;
  const V3 = sys().headPos.constructor;
  const Q = sys().lantern.group.quaternion.constructor;
  const M4 = sys().playerMatrix.constructor;
  const E = sys().lantern.group.rotation.constructor;
  const ease = (t) => t * t * t * (10 - 15 * t + 6 * t * t); // minimum-jerk

  const waitFor = async (pred, ms = 40000) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      if (pred()) return true;
      await sleep(100);
    }
    return false;
  };

  // Wrist rotation from finger and palm directions (WebXR wrist frame:
  // -Z along the fingers, +Y out of the back of the hand).
  const wrist = (fingers, palm) => {
    const z = new V3(...fingers).normalize().negate();
    const y = new V3(...palm).normalize().negate();
    const x = new V3().crossVectors(y, z).normalize();
    y.crossVectors(z, x);
    const q = new Q().setFromRotationMatrix(new M4().makeBasis(x, y, z));
    return [q.x, q.y, q.z, q.w];
  };
  const PALM_TO_WALL = wrist([0, 1, 0], [0, 0, -1]);
  const PINCH_SIDE = wrist([0, 0.6, -0.8], [-1, 0, 0]);

  const pin = { left: null, right: null };
  const place = (hand, side, anchor, target, rot) => {
    pin[side] = { anchor, target: [...target], rot };
    hand.setPin({ anchor, target: new Float32Array(target), wristRotation: rot ? new Float32Array(rot) : undefined });
  };
  const move = async (hand, side, anchor, target, rot, seconds = 1) => {
    const from = pin[side] && pin[side].anchor === anchor ? pin[side].target : target;
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      const k = ease(t);
      place(hand, side, anchor, from.map((v, i) => v + (target[i] - v) * k), rot);
      if (t >= 1) break;
      await sleep(16);
    }
  };
  const pose = async (hand, id, seconds = 0.35) => {
    if (!hand.beginPoseTransition(id)) {
      hand.poseId = id;
      return;
    }
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      hand.poseTransitionProgress = ease(t);
      if (t >= 1) break;
      await sleep(16);
    }
    hand.poseTransitionProgress = null;
  };
  const pinch = async (hand, value, seconds = 0.2) => {
    const from = hand.pinchValue;
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      hand.updatePinchValue(from + (value - from) * ease(t));
      if (t >= 1) break;
      await sleep(16);
    }
  };
  const head = async (yawDeg, pitchDeg, seconds = 2) => {
    const q0 = new Q(dev.quaternion.x, dev.quaternion.y, dev.quaternion.z, dev.quaternion.w);
    const q1 = new Q().setFromEuler(new E((pitchDeg * Math.PI) / 180, (yawDeg * Math.PI) / 180, 0, 'YXZ'));
    const t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      const q = q0.clone().slerp(q1, ease(t));
      dev.quaternion.set(q.x, q.y, q.z, q.w);
      if (t >= 1) break;
      await sleep(16);
    }
  };
  const REST_R = [0.24, 1.02, -0.3];
  const REST_L = [-0.24, 1.02, -0.3];
  const rest = async () => {
    await move(R, 'right', 'wrist', REST_R, null, 0.9);
    await pose(R, 'default', 0.3);
  };
  const aim = (x, y, from = 0.3) => sys().debugAim(x, y, from);
  const palm = async (x, y, id, seconds = 1.1, from = 0.3) => {
    await move(R, 'right', 'middle-finger-metacarpal', aim(x, y, from), PALM_TO_WALL, seconds);
    await pose(R, id, 0.35);
  };
  const W = () => sys().stage.width;
  const H = () => sys().stage.height;
  const creature = (s) => sys().debugCreatures().find((c) => c.s === s);
  const carry = async (species, toX) => {
    const c = creature(species);
    if (!c) return;
    await pose(R, 'default', 0.2);
    await move(R, 'right', 'grasp', aim(c.x, c.y, 0.32), PINCH_SIDE, 1.0);
    await pinch(R, 1, 0.25);
    await sleep(250);
    await move(R, 'right', 'grasp', aim((c.x + toX) / 2, c.y + 0.35, 0.32), PINCH_SIDE, 0.9);
    await move(R, 'right', 'grasp', aim(toX, c.y, 0.32), PINCH_SIDE, 0.9);
    await pinch(R, 0, 0.25);
    await sleep(400);
    await rest();
  };
  const beat = (n) => st().phase === 'tale' && st().beat >= n;

  dev.fovy = 1.36;
  if (segment === 'opening') {
    chh.resetSave();
    const w = sys().world;
    if (w.session) await w.session.end();
    await sleep(1500);
    dev.primaryInputMode = 'hand';
    dev.quaternion.set(0, Math.sin((38 * Math.PI) / 360), 0, Math.cos((38 * Math.PI) / 360));
    w.launchXR();
    await waitFor(() => st().phase === 'dim', 10000);
    place(R, 'right', 'wrist', REST_R, null);
    place(L, 'left', 'wrist', REST_L, null);
    await waitFor(() => st().phase === 'wall', 10000);
    await sleep(1200);
    await head(0, -5, 2.4);
    await sleep(1200);
    await move(R, 'right', 'wrist', [0.16, 1.3, -0.42], null, 0.8);
    await pinch(R, 1, 0.15);
    await sleep(200);
    await pinch(R, 0, 0.15);
    await rest();
    await waitFor(() => st().phase === 'first-light', 15000);
    await sleep(600);
    const x = W() * 0.42, y = H() * 0.55;
    // Keep the open hand gently moving (a held-still hand would wake a peacock).
    await palm(x, y, 'open', 1.4);
    await palm(x - 0.25, y + 0.1, 'open', 1.0);
    await palm(x + 0.15, y - 0.05, 'open', 1.0, 0.17);
    await palm(x - 0.1, y + 0.05, 'open', 1.0, 0.2);
    await palm(x, y, 'open', 1.0, 0.34);
    await pose(R, 'peace', 0.4);
    await waitFor(() => st().creatures > 0, 8000);
    await sleep(1500);
    await rest();
    await waitFor(() => st().phase === 'menu', 20000);
    await sleep(1500);
    const b = sys().debugButtons().find((b) => b.id === 'tale');
    await palm(b.x, b.y, 'flat', 1.2);
    await waitFor(() => st().phase === 'tale', 6000);
    await sleep(400);
    await rest();
    await waitFor(() => beat(1), 15000);
    return st();
  }

  if (segment === 'tale1') {
    const y = H() * 0.55;
    await palm(W() * 0.3, y, 'claw');
    await waitFor(() => creature('lion'), 8000);
    await sleep(1200);
    await rest();
    await waitFor(() => beat(3), 30000);
    await sleep(800);
    await palm(W() * 0.62, y, 'rock');
    await waitFor(() => creature('stag'), 8000);
    await sleep(1200);
    await rest();
    await waitFor(() => beat(5), 30000);
    await sleep(1500);
    await palm(W() * 0.86, y, 'peace');
    await waitFor(() => creature('hare'), 8000);
    await sleep(1200);
    await rest();
    await waitFor(() => beat(6), 20000);
    return st();
  }

  if (segment === 'tale2') {
    await sleep(1200);
    const lion = creature('lion');
    if (lion) await carry('hare', lion.x + 0.45);
    await waitFor(() => beat(9), 40000);
    await sleep(2000);
    await carry('lion', sys().scenery.wellX - 0.32);
    await waitFor(() => beat(10), 30000);
    await sleep(2200);
    await palm(W() * 0.45, H() * 0.55, 'fist', 1.0);
    await sleep(600);
    await pose(R, 'open', 0.15);
    await sleep(800);
    await rest();
    await waitFor(() => st().phase === 'tale-end', 45000);
    await sleep(4000);
    return st();
  }

  if (segment === 'open') {
    const b = sys().debugButtons().find((b) => b.id === 'open');
    if (b) {
      await palm(b.x, b.y, 'flat', 1.1);
      await waitFor(() => st().phase === 'open', 6000);
      await sleep(400);
      await rest();
    }
    await sleep(1500);
    const y = H() * 0.55;
    for (const [fx, id] of [[0.2, 'open'], [0.4, 'fist'], [0.6, 'point'], [0.8, 'flat'], [0.5, 'rock']]) {
      await palm(W() * fx, y, id, 1.0);
      const n = st().creatures;
      await waitFor(() => st().creatures > n, 6000);
      await sleep(900);
      await rest();
      await sleep(400);
    }
    await sleep(5000);
    return st();
  }
  if (segment === 'moon1') {
    // A returning visitor who has heard the first tale.
    const key = 'chhaya.save.v1';
    const old = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ ...old, tutorialDone: true, talesFinished: ['lion-and-hare'], lastTale: 'lion-and-hare', moonHare: null, visits: 3 }));
    chh.loadSave();
    const w = sys().world;
    if (w.session) await w.session.end();
    await sleep(1200);
    dev.primaryInputMode = 'hand';
    dev.quaternion.set(0, 0, 0, 1);
    w.launchXR();
    await waitFor(() => st().phase === 'dim', 10000);
    place(R, 'right', 'wrist', REST_R, null);
    place(L, 'left', 'wrist', REST_L, null);
    await head(0, -5, 1.5);
    await waitFor(() => st().phase === 'wall' || st().phase === 'curtain' || st().phase === 'menu', 12000);
    if (st().phase === 'wall') {
      await sleep(1500);
      await move(R, 'right', 'wrist', [0.16, 1.3, -0.42], null, 0.8);
      await pinch(R, 1, 0.15);
      await sleep(200);
      await pinch(R, 0, 0.15);
      await rest();
    }
    await waitFor(() => st().phase === 'menu', 15000);
    await sleep(3000);
    const b = sys().debugButtons().find((b) => b.id === 'tale');
    await palm(b.x, b.y, 'flat', 1.1);
    await waitFor(() => st().phase === 'tale', 6000);
    await sleep(300);
    await rest();
    await waitFor(() => beat(1), 15000);
    const y = H() * 0.55;
    await palm(W() * 0.45, y, 'peace');
    await waitFor(() => creature('hare'), 8000);
    await sleep(1000);
    await rest();
    await waitFor(() => beat(2), 20000);
    await sleep(1000);
    await palm(W() * 0.68, y, 'open');
    await waitFor(() => creature('peacock'), 8000);
    await sleep(800);
    await rest();
    await waitFor(() => beat(4), 30000);
    return { ...st(), tale: sys().tale.id };
  }

  if (segment === 'moon2') {
    await waitFor(() => beat(5), 30000);
    await sleep(2500);
    const y = H() * 0.55;
    await palm(W() * 0.5, y, 'fist', 1.0);
    await sleep(600);
    await pose(R, 'open', 0.15);
    await sleep(800);
    await rest();
    await waitFor(() => beat(6), 10000);
    await sleep(1500);
    await carry('hare', sys().scenery.fireX + 0.05);
    await waitFor(() => st().phase === 'tale-end', 60000);
    await sleep(3000);
    return { ...st(), moon: !!sys().scenery.moonHare };
  }

  if (segment === 'paper') {
    // Paper-screen fallback: forget the wall, look at the ceiling, pinch.
    if (!sys().world.session) {
      dev.primaryInputMode = 'hand';
      dev.quaternion.set(0, 0, 0, 1);
      sys().world.launchXR();
      await waitFor(() => st().phase === 'dim', 10000);
      place(R, 'right', 'wrist', REST_R, null);
      place(L, 'left', 'wrist', REST_L, null);
    }
    await waitFor(() => st().phase === 'menu' || st().phase === 'wall', 20000);
    if (st().phase === 'menu') sys().onButton('move');
    await waitFor(() => st().phase === 'wall', 5000);
    await head(0, 70, 1.2);
    await sleep(3800);
    await move(R, 'right', 'wrist', [0.16, 1.3, -0.42], null, 0.6);
    await pinch(R, 1, 0.15);
    await sleep(200);
    await pinch(R, 0, 0.15);
    await rest();
    await head(0, -5, 1.2);
    await waitFor(() => st().stagePlaced, 5000);
    await sleep(5000);
    return { ...st() };
  }

  if (segment === 'check') {
    dev.primaryInputMode = 'hand';
    sys().world.launchXR();
    await waitFor(() => st().phase === 'menu', 20000);
    await sleep(2500);
    const sc = sys().scenery;
    return { ...st(), moonHare: !!sc.moonHare, moon: sc.moon };
  }

  return 'unknown segment';
})
