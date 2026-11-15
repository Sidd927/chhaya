// Dev-only: record a clean 1920x1080 take of the emulator.
// Hides the emulator's developer panels and screencasts for REC_SECONDS
// (at most ~100 s per call: the managed browser limits script leases).
import { mkdirSync, writeFileSync } from 'node:fs';
export default async function run({ page, frame }) {
  const dir = process.env.REC_DIR || '/tmp/chhaya-rec';
  const seconds = Number(process.env.REC_SECONDS || 10);
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const fr = frame ?? page;
  const hide = () =>
    fr.evaluate(() => {
      for (const e of document.body.children) if (e.shadowRoot) e.style.display = 'none';
    });
  await hide();
  const cdp = await page.context().newCDPSession(page);
  const stamps = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const name = `${process.env.REC_PREFIX || 'f'}${String(n++).padStart(6, '0')}.jpg`;
    writeFileSync(`${dir}/${name}`, Buffer.from(f.data, 'base64'));
    stamps.push([name, f.metadata.timestamp]);
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 2 });
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    await page.waitForTimeout(2000);
    await hide();
  }
  await cdp.send('Page.stopScreencast');
  writeFileSync(`${dir}/stamps-${process.env.REC_PREFIX || 'f'}.json`, JSON.stringify(stamps));
  console.log(JSON.stringify({ frames: n, seconds }));
}
