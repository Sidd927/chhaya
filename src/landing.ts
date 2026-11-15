/**
 * The 2D landing page shown in the Quest Browser before entering, and again
 * after leaving the theater with a short summary of what you found.
 */
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import './landing.css';
import { ALL_SPECIES, SPECIES_INFO } from './theater/hand-shape.js';
import { Save } from './theater/save.js';

interface LandingOptions {
  /** Resolves with whether the world can start an XR session. */
  ready: Promise<boolean>;
  enter: () => void;
}

export function initLanding(opts: LandingOptions): void {
  const landing = document.getElementById('landing')!;
  const button = document.getElementById('enter') as HTMLButtonElement;
  const label = document.getElementById('enter-label')!;
  const status = document.getElementById('status')!;
  const list = document.getElementById('shape-list')!;

  const renderShapes = () => {
    const save = new Save();
    list.innerHTML = '';
    for (const s of ALL_SPECIES) {
      const info = SPECIES_INFO[s];
      const li = document.createElement('li');
      const found = save.data.discovered.includes(s);
      li.className = found ? 'found' : '';
      li.innerHTML = `<span class="shape-name">${found ? info.name : '?'}</span><span class="shape-how">${info.gesture}</span>`;
      list.appendChild(li);
    }
    return save;
  };
  const save = renderShapes();

  const checkSupport = async () => {
    const xr = (navigator as any).xr as XRSystem | undefined;
    let ar = false;
    try {
      ar = !!xr && (await xr.isSessionSupported('immersive-ar'));
    } catch {
      ar = false;
    }
    const xrEnabled = await opts.ready;
    if (ar && xrEnabled) {
      button.disabled = false;
      label.textContent = save.data.visits > 0 ? 'Return to the theater' : 'Enter the theater';
      status.textContent = '';
    } else {
      button.disabled = true;
      label.textContent = 'Open on Meta Quest';
      status.textContent =
        'Chhaya needs mixed reality with hand tracking. Open this page in the Meta Quest Browser on Quest 3 or 3S.';
    }
  };
  void checkSupport();
  // The emulator in development installs itself a moment after load.
  setTimeout(() => void checkSupport(), 1500);

  button.addEventListener('click', () => {
    if (button.disabled) return;
    opts.enter();
  });

  window.addEventListener('chhaya:session', (e) => {
    const detail = (e as CustomEvent).detail as { active: boolean; discovered?: number; total?: number };
    landing.classList.toggle('in-session', detail.active);
    if (!detail.active) {
      renderShapes();
      label.textContent = 'Return to the theater';
      if (detail.discovered !== undefined) {
        status.textContent = `The curtain is down. You have woken ${detail.discovered} of ${detail.total} shadows; the rest are waiting.`;
      }
    }
  });
}
