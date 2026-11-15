export default async function run({ page, frame }) {
  const vp = page.viewportSize();
  const frames = page.frames().map((f) => f.url());
  const fr = frame ?? page;
  const el = await fr.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('body *')) {
      const t = (e.textContent || '').trim();
      if (t === 'Remote Control Active' || e.id?.includes('iwer') || e.className?.toString().includes('iwer')) out.push(e.tagName + '#' + e.id + '.' + e.className);
    }
    return { out: out.slice(0, 10), w: innerWidth, h: innerHeight, dpr: devicePixelRatio };
  });
  console.log(JSON.stringify({ vp, frames, el, pageIsFrame: frame === page }));
}
