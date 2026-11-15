export default async function run({ page, frame }) {
  const w = Number(process.env.VW || 1920), h = Number(process.env.VH || 1080);
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(800);
  const size = await (frame ?? page).evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => { const r = f.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  console.log(JSON.stringify({ size, boxes }));
}
