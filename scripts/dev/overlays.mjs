export default async function run({ frame, page }) {
  const fr = frame ?? page;
  const info = await fr.evaluate(() => {
    const out = [];
    for (const e of document.body.children) {
      const r = e.getBoundingClientRect();
      out.push([e.tagName, e.id, String(e.className).slice(0, 40), Math.round(r.width), Math.round(r.height), getComputedStyle(e).position, !!e.shadowRoot]);
    }
    return out;
  });
  console.log(JSON.stringify(info));
}
