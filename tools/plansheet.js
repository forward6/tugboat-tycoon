// Draw the plan sheets (src/plans.js) as pictures, to check them: every boat you can buy and a sample of each lake ship.
//   node tools/plansheet.js <outdir> [id ...]      writes <id>.png, and <id>-thumb.png for the small view on the boat's page
const fs = require('fs'), path = require('path');
const PLAN = require(path.join(__dirname, '..', 'src', 'plans.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.html'), 'utf8');
const grab = name => new Function(src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`))[0].replace(`const ${name} = `, 'return '))();
const MODELS = grab('MODELS'), SHIP_TYPES = grab('SHIP_TYPES');
const SAMPLE = { schooner2: [112, 23, 9], schooner3: [138, 26, 10.5], steambarge: [190, 35, 13], laker: [550, 58, 19], canaller: [261, 43, 14], passenger: [320, 44, 15] };
const defs = {};
for (const id in PLAN.BOATS) defs[id] = PLAN.boatDef(id, MODELS[id]);
for (const t in SAMPLE) { const [l, b, d] = SAMPLE[t]; defs[t] = PLAN.shipDef({ type: t, lenFt: l, beamFt: b, draftFt: d, name: 'Sample', built: 1900, place: 'Collingwood' }, SHIP_TYPES[t]); }
(async () => {
  const [outdir, ...want] = process.argv.slice(2);
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.25 });
  const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&family=IM+Fell+English+SC&display=swap">';
  for (const id of want.length ? want : Object.keys(defs)) {
    for (const thumb of [false, true]) {
      const svg = PLAN.sheet(defs[id], { thumb });
      await p.setContent(`<!doctype html>${fonts}<body style="margin:0;background:#888">${thumb ? '<div style="width:340px;padding:10px">' : ''}${svg}${thumb ? '</div>' : ''}</body>`);
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
      const el = await p.$('svg'); if (thumb) await p.evaluate(() => { document.querySelector('svg').style.width = '340px'; document.querySelector('svg').style.height = 'auto'; });
      await el.screenshot({ path: path.join(outdir, `${id}${thumb ? '-thumb' : ''}.png`) });
    }
    console.log('drew', id);
  }
  await b.close();
})();
