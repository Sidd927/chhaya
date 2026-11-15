/**
 * Chhaya — a shadow theater for your hands.
 * Entry point: creates the IWSDK world, registers the theater, and connects
 * the landing page to the immersive session.
 */
import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { TheaterSystem } from './theater/director.js';
import { initLanding } from './landing.js';

World.create(document.getElementById('scene-container') as HTMLDivElement, projectOptions).then((world) => {
  world.registerSystem(TheaterSystem);

  // In passthrough your real hands cast the shadows, so the SDK's rendered
  // hand meshes stay hidden. The browser emulator has no real hands to see,
  // so there (and with ?hands=1) the rendered hands are shown.
  const params = new URLSearchParams(location.search);
  const emulated = !!(window as any).IWER_DEVICE || !!(window as any).__IWER__ || import.meta.env.DEV;
  const showHands = params.get('hands') === '1' || (params.get('hands') !== '0' && emulated);
  const applyHandVisuals = () => {
    const adapters = world.input.visualAdapters.hand;
    adapters.left.toggleVisual(showHands);
    adapters.right.toggleVisual(showHands);
  };
  world.visibilityState.subscribe((v) => {
    if (v !== VisibilityState.NonImmersive) requestAnimationFrame(applyHandVisuals);
  });

  initLanding({
    canEnter: () => world.xrEnabled,
    enter: () => {
      window.dispatchEvent(new Event('chhaya:enter'));
      world.launchXR();
    },
  });
});
