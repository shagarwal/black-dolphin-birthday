// State/accessibility tests for the envelope card. Run:
//   ~/.hermes/scripts/isolated-run.sh --cwd /home/hermes/black-dolphin-birthday -- node tests/check.js [baseURL]
// Requires a static server at baseURL (default http://127.0.0.1:8765/).
const path = require('path');
const { chromium } = require(path.join(process.env.HOME, '.hermes/playwright/node_modules/playwright-core'));

const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const SHOTS = process.argv[3] || '';
let failures = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ok   ' + msg); } else { failures++; console.log('  FAIL ' + msg); } }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function state(page) { return page.evaluate(() => document.body.dataset.state); }
async function waitState(page, s, t = 6000) {
  try { await page.waitForFunction((s) => document.body.dataset.state === s, s, { timeout: t }); return true; } catch { return false; }
}
async function layoutChecks(page, label) {
  const m = await page.evaluate(() => {
    const card = document.getElementById('card').getBoundingClientRect();
    const imgs = [...document.images].filter(i => i.getClientRects().length > 0).map(i => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 }));
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight,
      card: { l: card.left, r: card.right, t: card.top, b: card.bottom }, imgs };
  });
  ok(m.sw <= m.iw, `${label}: no horizontal overflow (scrollWidth ${m.sw} <= ${m.iw})`);
  ok(m.card.l >= -1 && m.card.r <= m.iw + 1, `${label}: card inside viewport horizontally (${m.card.l.toFixed(0)}..${m.card.r.toFixed(0)})`);
  ok(m.card.t >= -1 && m.card.b <= m.ih + 1, `${label}: card inside viewport vertically (${m.card.t.toFixed(0)}..${m.card.b.toFixed(0)} of ${m.ih})`);
  const bad = m.imgs.filter(i => !i.ok);
  ok(m.imgs.length >= 3 && bad.length === 0, `${label}: all ${m.imgs.length} visible images decoded${bad.length ? ' (bad: ' + bad.map(b => b.src).join(',') + ')' : ''}`);
}

async function run(browser, vp, name) {
  console.log(`\n== ${name} ${vp.width}x${vp.height}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  ok(await state(page) === 'sealed', 'initial state sealed');
  ok(await page.getAttribute('#envelope', 'aria-expanded') === 'false', 'envelope aria-expanded=false');
  ok(await page.evaluate(() => document.getElementById('card').inert === true), 'card inert while sealed');
  ok(await page.evaluate(() => document.getElementById('peek').hidden), 'peek hidden initially');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/envelope-${name}-sealed.png` });

  await page.click('#envelope');
  await sleep(700);
  const mid = await state(page);
  ok(mid !== 'sealed' && mid !== 'revealed', `mid-animation state is an intermediate stage (${mid})`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/envelope-${name}-opening.png` });
  ok(await waitState(page, 'revealed'), 'reaches revealed');
  await sleep(1800); // dolphin flourish + postcards settle
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/envelope-${name}-revealed.png` });
  ok(await page.getAttribute('#envelope', 'aria-expanded') === 'true', 'envelope aria-expanded=true');
  ok(await page.evaluate(() => document.getElementById('card').inert === false), 'card not inert when revealed');
  ok(await page.evaluate(() => document.getElementById('card').contains(document.activeElement)), 'focus moved into card');
  await layoutChecks(page, 'revealed');
  const text = await page.evaluate(() => document.getElementById('card').innerText);
  ok(/Happy Birthday/.test(text), 'card says Happy Birthday');
  ok(/Black Dolphin Inn/.test(text), 'card names Black Dolphin Inn');
  ok(!/\$\d/.test(text), 'no prices in card');

  // Peek panel
  await page.click('#peek-open');
  await sleep(500);
  ok(await page.evaluate(() => !document.getElementById('peek').hidden), 'peek panel shown');
  ok(await page.evaluate(() => document.getElementById('peek').contains(document.activeElement)), 'focus moved into peek');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/envelope-${name}-peek.png` });
  const peekOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(peekOverflow, 'no horizontal overflow with peek open');
  await page.waitForFunction(() => [...document.querySelectorAll('#peek img')].every(i => i.complete), null, { timeout: 5000 }).catch(() => {});
  const peekImgs = await page.evaluate(() => [...document.querySelectorAll('#peek img')].map(i => i.complete && i.naturalWidth > 0));
  ok(peekImgs.length === 3 && peekImgs.every(Boolean), `peek: all ${peekImgs.length} images decoded`);
  const peekText = await page.evaluate(() => document.getElementById('peek').innerText);
  ok(/riverfront|river/i.test(peekText) && !/beachfront/i.test(peekText), 'peek says river, never beachfront');
  ok(/blackdolphininn\.com/.test(await page.evaluate(() => document.getElementById('peek').innerHTML)), 'peek links blackdolphininn.com');
  await page.keyboard.press('Escape');
  await sleep(400);
  ok(await page.evaluate(() => document.getElementById('peek').hidden), 'Escape closes peek');
  ok(await page.evaluate(() => document.activeElement.id === 'peek-open'), 'focus returns to Peek button');

  // Replay
  await page.click('#replay');
  ok(await waitState(page, 'sealed', 4000), 'replay returns to sealed');
  ok(await page.evaluate(() => document.getElementById('card').inert === true), 'card inert again after replay');
  ok(await page.evaluate(() => document.activeElement.id === 'envelope'), 'focus returns to envelope after replay');

  // Keyboard open: Enter
  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => document.activeElement.id === 'envelope'), 'first Tab lands on envelope');
  await page.keyboard.press('Enter');
  ok(await waitState(page, 'revealed'), 'Enter opens the envelope');
  // Space
  await page.reload({ waitUntil: 'networkidle' });
  await page.focus('#envelope');
  await page.keyboard.press('Space');
  ok(await waitState(page, 'revealed'), 'Space opens the envelope');

  ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();

  // Reduced motion
  const ctx2 = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.click('#envelope');
  ok(await waitState(p2, 'revealed', 400), 'reduced motion: revealed within 400ms');
  await sleep(100);
  const snap = () => p2.evaluate(() => { const c = document.getElementById('card'); const r = c.getBoundingClientRect();
    return [getComputedStyle(c).transform, getComputedStyle(c.querySelector('.card-cover')).transform, r.width.toFixed(1), r.height.toFixed(1), r.top.toFixed(1)].join('|'); });
  const t1 = await snap(); await sleep(200); const t2 = await snap();
  ok(t1 === t2, `reduced motion: card stable (no mid-flight transform) ${t1 === t2 ? '' : t1 + ' vs ' + t2}`);
  await layoutChecks(p2, 'reduced-motion');
  if (SHOTS) await p2.screenshot({ path: `${SHOTS}/envelope-${name}-reduced.png` });
  await ctx2.close();

  // No-JS fallback
  const ctx3 = await browser.newContext({ viewport: vp, javaScriptEnabled: false });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE, { waitUntil: 'load' });
  const vis = await p3.evaluate(() => {
    const c = document.getElementById('card'); const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
    return { w: r.width, vis: cs.visibility, op: cs.opacity, txt: c.innerText.includes('Happy Birthday') };
  });
  ok(vis.w > 100 && vis.vis !== 'hidden' && parseFloat(vis.op) > 0.9 && vis.txt, `no-JS: card readable (w=${vis.w.toFixed(0)} vis=${vis.vis} op=${vis.op})`);
  if (SHOTS) await p3.screenshot({ path: `${SHOTS}/envelope-${name}-nojs.png`, fullPage: true });
  await ctx3.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    await run(browser, { width: 390, height: 844 }, 'm390');
    await run(browser, { width: 360, height: 740 }, 'm360');
    await run(browser, { width: 1440, height: 900 }, 'd1440');
  } finally { await browser.close(); }
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
