// Dev-only: resize the managed page to 1920x1080, then (re)enter XR so the
// emulator's canvas is created at that size.
export default async function run({ page, frame }) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const fr = frame ?? page;
  await fr.evaluate(async () => {
    const w = window.__chhaya.system.world;
    if (w.session) await w.session.end();
  });
  await page.waitForTimeout(1500);
  await fr.evaluate(() => window.__chhaya.system.world.launchXR());
  await page.waitForTimeout(2500);
  const size = await fr.evaluate(() => [innerWidth, innerHeight, window.__chhaya.state.phase]);
  console.log(JSON.stringify({ size }));
}
