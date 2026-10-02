// Frame-by-frame screenshots of the opening sequence (visual review only).
const path = require('path');
const { chromium } = require(path.join(process.env.HOME, '.hermes/playwright/node_modules/playwright-core'));
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const OUT = process.argv[3];
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['m390', { width: 390, height: 844 }], ['d1440', { width: 1440, height: 900 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(BASE, { waitUntil: 'networkidle' });
    const t0 = Date.now();
    await p.click('#envelope');
    for (const ms of [300, 900, 1400, 1800, 2300]) {
      const wait = ms - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
      await p.screenshot({ path: `${OUT}/frames-${name}-${ms}.png` });
      console.log(name, ms, await p.evaluate(() => document.body.dataset.state));
    }
    await ctx.close();
  }
  await b.close();
})();
