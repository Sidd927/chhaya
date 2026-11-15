/**
 * Chhaya — a shadow theater for your hands.
 * Entry point: shows the landing page at once, creates the IWSDK world, and
 * connects the two.
 */
import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { initLanding } from './landing.js';
import { TheaterSystem } from './theater/director.js';

let resolveWorld: (w: World) => void;
const worldReady = new Promise<World>((r) => (resolveWorld = r));

initLanding({
  ready: worldReady.then((w) => w.xrEnabled),
  enter: () => {
    window.dispatchEvent(new Event('chhaya:enter'));
    void worldReady.then((w) => w.launchXR());
  },
});

World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions).then((world) => {
  world.registerSystem(TheaterSystem);

  // In passthrough your real hands cast the shadows, so the SDK's rendered
  // hand meshes stay hidden. The browser emulator has no real hands to see,
  // so there (and with ?hands=1) the rendered hands are shown.
  const params = new URLSearchParams(location.search);
  const emulated = import.meta.env.DEV || !!(window as any).IWER_DEVICE;
  const showHands = params.get('hands') === '1' || (params.get('hands') !== '0' && emulated);
  const applyHandVisuals = () => {
    const adapters = world.input.visualAdapters.hand;
    adapters.left.toggleVisual(showHands);
    adapters.right.toggleVisual(showHands);
  };
  world.visibilityState.subscribe((v) => {
    if (v !== VisibilityState.NonImmersive) requestAnimationFrame(applyHandVisuals);
  });
  resolveWorld(world);
});
