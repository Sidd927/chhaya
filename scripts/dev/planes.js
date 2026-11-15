const s = window.__chhaya.system;
const out = await new Promise((resolve) => {
  const stop = s.world.onXRFrame((frame) => {
    stop();
    const ref = s.world.xrReferenceSpace;
    const res = [];
    for (const p of frame.detectedPlanes ?? []) {
      const pose = frame.getPose(p.planeSpace, ref);
      const xs = p.polygon.map((v) => v.x), zs = p.polygon.map((v) => v.z);
      res.push({ label: p.semanticLabel, o: p.orientation, w: +(Math.max(...xs) - Math.min(...xs)).toFixed(2), h: +(Math.max(...zs) - Math.min(...zs)).toFixed(2), pos: pose ? [pose.transform.position.x, pose.transform.position.y, pose.transform.position.z].map((v) => +v.toFixed(2)) : null });
    }
    resolve(res);
  });
});
return out;
