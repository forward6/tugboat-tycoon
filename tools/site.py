"""The standalone copy: index.html (built by tools/build.py) as a home-screen web app -> site/, and site/ zipped -> dist/.
Upload site/ (or the zip) to any static host: GitHub Pages, Cloudflare Pages, Netlify. Added to an iPad's home screen it
opens full screen with its own icon; a service worker keeps a copy so it opens without a connection.
  python3 tools/site.py"""
import hashlib, json, pathlib, shutil, zipfile
root = pathlib.Path(__file__).resolve().parent.parent
site, dist = root / 'site', root / 'dist'
page = (root / 'index.html').read_text()
ICONS = ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.svg', 'favicon-32.png', 'og-image.png']

# what a link to the game shows when it is shared (the picture is drawn by tools/logo.py and tools/icons.js)
HOME = 'https://tugboattycoon.com/'
DESC = 'Build a tugboat company on Georgian Bay from 1870: tow logs and schooners, fish the grounds and race your rivals through ninety years of real history.'
head = '''<meta charset="utf-8">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tugboat">
<meta name="theme-color" content="#1c2731">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<meta name="description" content="{DESC}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tugboat Tycoon">
<meta property="og:title" content="Tugboat Tycoon">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{HOME}">
<meta property="og:image" content="{HOME}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The Tugboat Tycoon badge: a steam tug passing a windswept pine on Georgian Bay at sunset, in a rope ring">
<meta name="twitter:card" content="summary_large_image">'''
head = head.replace('{DESC}', DESC).replace('{HOME}', HOME)
# the version: the page, its head and the icons, so a new icon is a new version too (and the offline copy is refreshed)
h = hashlib.sha1((page + head).encode())
for f in ICONS: h.update((root / 'assets' / f).read_bytes())
ver = h.hexdigest()[:10]
assert page.startswith('<meta charset="utf-8">'), 'index.html should start with its charset'
page = '<!doctype html>\n<html lang="en">\n' + page.replace('<meta charset="utf-8">', head, 1) + '''
<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
</html>
'''

manifest = {
  'name': 'Tugboat Tycoon', 'short_name': 'Tugboat', 'description': 'Towing and fishing tugs on Georgian Bay, from 1870.',
  'start_url': './', 'scope': './', 'display': 'fullscreen', 'display_override': ['fullscreen', 'standalone'],
  'orientation': 'any', 'background_color': '#efe6cf', 'theme_color': '#1c2731',
  'icons': [{'src': f'icon-{n}.png', 'sizes': f'{n}x{n}', 'type': 'image/png', 'purpose': 'any'} for n in (192, 512)]
           + [{'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
}

# Network first, so a new version arrives as soon as there is a connection; the cache is for playing offline
sw = f'''const CACHE = 'tugboat-{ver}';
self.addEventListener('install', e => {{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'favicon.svg', 'favicon-32.png']))); }});
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.includes('/api/')) return; // the scoreboard and saves always come fresh, and aren't kept
  e.respondWith(fetch(e.request).then(r => {{
    if (r.ok || r.type === 'opaque') {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }}
    return r;
  }}).catch(() => caches.match(e.request, {{ ignoreSearch: true }}).then(r => r || caches.match('./'))));
}});
'''

if site.exists(): shutil.rmtree(site)
site.mkdir()
(site / 'index.html').write_text(page)
(site / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2))
(site / 'sw.js').write_text(sw)
(site / '.nojekyll').write_text('')
for f in ICONS: shutil.copy(root / 'assets' / f, site / f)
# the privacy page, and the owner's page of players
for name in ('privacy.html', 'admin.html'): shutil.copy(root / 'src' / name, site / name)
dist.mkdir(exist_ok=True)
z = dist / 'tugboat-tycoon-site.zip'
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as f:
  for p in sorted(site.iterdir()): f.write(p, p.name)
print('built site/ and', z.relative_to(root), f'({z.stat().st_size // 1024} KB), version {ver}')
