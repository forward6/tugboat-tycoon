// Draw the home-screen icon (assets/icon.svg) as PNGs for the standalone site: node tools/icons.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets');
(async () => {
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  for (const n of [180, 192, 512]) {
    await p.setViewportSize({ width: n, height: n });
    await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}</body>`);
    await p.screenshot({ path: path.join(dir, `icon-${n}.png`), clip: { x: 0, y: 0, width: n, height: n } });
    console.log('drew icon', n);
  }
  await b.close();
})();
