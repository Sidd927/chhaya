// Dev-only helper: evaluate an expression in the managed emulator page.
// Usage: CHHAYA_EVAL='expr' npx @iwsdk/cli browser run scripts/dev/eval.mjs
import { readFileSync } from 'node:fs';
export default async function run({ page, frame }) {
  const target = frame ?? page;
  const src = process.env.CHHAYA_EVAL_FILE ? readFileSync(process.env.CHHAYA_EVAL_FILE, 'utf8') : process.env.CHHAYA_EVAL;
  const result = await target.evaluate(`(async () => { ${src} })()`);
  console.log(JSON.stringify(result, null, 1));
  return result;
}
