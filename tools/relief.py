"""The lie of the land: data/relief.png (heights) and data/contours.txt (contour lines), from Mapzen's terrain tiles
on Amazon (open data; SRTM and other public sources), resampled onto the game's map. Run it once; build.py inlines both.
  python3 tools/relief.py          needs numpy, Pillow and contourpy; fetches about a hundred tiles (a few MB)
Heights are stored a byte a cell at 2 cells to the km: metres = 60 + 2.5 * value (Lake Ontario is at 75 m). Contours are every 100 feet, as on
the old Canadian maps, from 300 ft (above Lake Ontario) up; every fifth (500 ft) is an index contour."""
import io, json, math, pathlib, urllib.request
import numpy as np
from PIL import Image
import contourpy

root = pathlib.Path(__file__).resolve().parent.parent
M = json.loads((root / 'data' / 'map.json').read_text())
W_, E_, S_, N_, KX, KY = M['W'], M['E'], M['S'], M['N'], M['KX'], M['KY']
Z = 9
cache = root / 'data' / 'relief_raw'; cache.mkdir(exist_ok=True)

def tx(lon): return (lon + 180) / 360 * 2 ** Z
def ty(lat): return (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** Z

x0, x1, y0, y1 = int(tx(W_)), int(tx(E_)), int(ty(N_)), int(ty(S_))
mosaic = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        f = cache / f'{Z}_{x}_{y}.png'
        if not f.exists():
            f.write_bytes(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', timeout=60).read())
        a = np.asarray(Image.open(f).convert('RGB'), np.float32)
        mosaic[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
print('tiles', (x1 - x0 + 1) * (y1 - y0 + 1))

def grid(k):
    """Heights on the map's own grid, k cells to the km, sampled bilinearly from the tiles"""
    w, h = int(math.ceil(M['width'] * k)), int(math.ceil(M['height'] * k))
    xs, ys = (np.arange(w) + .5) / k, (np.arange(h) + .5) / k
    lon, lat = W_ + xs / KX, N_ - ys / KY
    px = (np.array([tx(v) for v in lon]) - x0) * 256 - .5
    py = (np.array([ty(v) for v in lat]) - y0) * 256 - .5
    PX, PY = np.meshgrid(px, py)
    i0, j0 = np.clip(np.floor(PX).astype(int), 0, mosaic.shape[1] - 2), np.clip(np.floor(PY).astype(int), 0, mosaic.shape[0] - 2)
    fx, fy = np.clip(PX - i0, 0, 1), np.clip(PY - j0, 0, 1)
    a, b, c, d = mosaic[j0, i0], mosaic[j0, i0 + 1], mosaic[j0 + 1, i0], mosaic[j0 + 1, i0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def blur(a, s):
    r = int(s * 3); k = np.exp(-(np.arange(-r, r + 1) ** 2) / (2 * s * s)); k /= k.sum()
    a = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, a)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, a)

# heights, two cells to the km
H2 = grid(2)
q = np.clip(np.round((H2 - 60) / 2.5), 0, 255).astype(np.uint8)
Image.fromarray(q, 'L').save(root / 'data' / 'relief.png', optimize=True)
print('relief.png', q.shape[::-1], (root / 'data' / 'relief.png').stat().st_size // 1024, 'KB', 'range', round(float(H2.min())), round(float(H2.max())), 'm')

# contours from a finer, slightly smoothed grid
K = 4
H4 = blur(grid(K), .9)
gen = contourpy.contour_generator(z=H4, line_type='Separate')

def simplify(pts, tol):
    if len(pts) < 3: return pts
    keep = np.zeros(len(pts), bool); keep[0] = keep[-1] = True; st = [(0, len(pts) - 1)]
    while st:
        i, j = st.pop(); a, b = pts[i], pts[j]; ab = b - a; L = np.hypot(*ab)
        seg = pts[i + 1:j]
        if not len(seg): continue
        d = np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / L if L else np.hypot(*(seg - a).T)
        k = int(np.argmax(d))
        if d[k] > tol: m = i + 1 + k; keep[m] = True; st += [(i, m), (m, j)]
    return pts[keep]

# packed as zigzag varints in base64: per level its feet and line count; per line its point count, first point, then steps
def varint(v, b):
    while True:
        x = v & 127; v >>= 7
        if v: b.append(x | 128)
        else: b.append(x); return
zz = lambda v: v * 2 if v >= 0 else -v * 2 - 1
buf, npts, nlines = bytearray(), 0, 0
levels = list(range(300, 2100, 100))
varint(len(levels), buf)
for ft in levels:
    lines = []
    for ln in gen.lines(ft * .3048):
        p = (ln + .5) / K                                   # cell centres to km
        if len(p) < 4 or np.hypot(*np.diff(p, axis=0).T).sum() < (3 if ft % 500 == 0 else 6): continue  # drop specks
        p = simplify(p, .13)
        qp = np.round(p * 50).astype(int)                   # 20 m steps
        qp = qp[np.r_[True, np.any(np.diff(qp, axis=0) != 0, axis=1)]]
        if len(qp) >= 3: lines.append(qp)
    varint(ft // 100, buf); varint(len(lines), buf)
    for qp in lines:
        varint(len(qp), buf); varint(int(qp[0, 0]), buf); varint(int(qp[0, 1]), buf)
        for dx, dy in np.diff(qp, axis=0): varint(zz(int(dx)), buf); varint(zz(int(dy)), buf)
        npts += len(qp); nlines += 1
import base64
(root / 'data' / 'contours.txt').write_text(base64.b64encode(bytes(buf)).decode())
print('contours.txt', nlines, 'lines', npts, 'points', (root / 'data' / 'contours.txt').stat().st_size // 1024, 'KB')
