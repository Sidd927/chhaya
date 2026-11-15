// Dev-only: record one choreography segment (scripts/dev/choreo.js) of the
// IWER emulator at 1920x1080, 30 fps, as JPEG frames in REC_DIR/SEGMENT/.
// Usage: SEGMENT=opening npx @iwsdk/cli browser run scripts/dev/film.mjs --timeout 108000
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export default async function run({ page, frame, workspaceRoot }) {
  const segment = process.env.SEGMENT || 'opening';
  const dir = `${process.env.REC_DIR || '/tmp/chhaya-film'}/${segment}`;
  mkdirSync(dir, { recursive: true });
  const fr = frame ?? page;
  // Hide everything but the app: emulator panels inside the frame, and the
  // workspace chrome around it.
  const clean = async () => {
    await fr.evaluate(() => {
      for (const e of document.body.children) if (e.shadowRoot) e.style.display = 'none';
    });
    if (frame) {
      await page.evaluate(() => {
        for (const f of document.querySelectorAll('iframe')) {
          Object.assign(f.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '2147483647' });
        }
      });
    }
  };
  await clean();
  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    writeFileSync(`${dir}/${String(n++).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64'));
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
  const src = readFileSync(`${workspaceRoot}/scripts/dev/choreo.js`, 'utf8');
  const keepClean = setInterval(() => void clean().catch(() => undefined), 1500);
  let result;
  try {
    result = await fr.evaluate(`(${src})(${JSON.stringify(segment)})`);
  } finally {
    clearInterval(keepClean);
    await cdp.send('Page.stopScreencast');
  }
  console.log(JSON.stringify({ segment, frames: n, result }));
}
