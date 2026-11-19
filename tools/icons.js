// Draw the game's icons and its link picture as PNGs, from the SVGs tools/logo.py makes: node tools/icons.js
//   assets/icon.svg    -> icon-180.png (iPad and iPhone home screen), icon-192.png and icon-512.png (browsers, Android)
//   assets/icon-maskable.svg -> icon-maskable-512.png (Android's adaptive icon: the badge within the middle 80%)
//   assets/favicon.svg -> favicon-32.png (the browser tab, where the SVG itself isn't taken)
//   assets/og.svg      -> og-image.png (1200 x 630: the picture a link to the game shows when it is shared)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets');
const jobs = [
  ['icon.svg', 180, 180, 'icon-180.png'], ['icon.svg', 192, 192, 'icon-192.png'], ['icon.svg', 512, 512, 'icon-512.png'],
  ['icon-maskable.svg', 512, 512, 'icon-maskable-512.png'],
  ['favicon.svg', 32, 32, 'favicon-32.png', true],
  ['og.svg', 1200, 630, 'og-image.png'],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [src, w, h, out, clear] of jobs) {
    const svg = fs.readFileSync(path.join(dir, src), 'utf8');
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `)}</body>`);
    await p.screenshot({ path: path.join(dir, out), clip: { x: 0, y: 0, width: w, height: h }, omitBackground: !!clear });
    console.log('drew', out);
  }
  await b.close();
})();
