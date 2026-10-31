"""Lake depths: data/depth.png, metres a cell at two cells to the km, from soundings read off a carved depth map of the
Great Lakes (NOAA's charts are the source of such maps): its depth labels and the shape of its layers, at the points
below, georeferenced against the game's own coastline. Between the points the depth is a smooth weighted average, and it
shoals to nothing over the last few km to the shore. Lakes without soundings (Erie, St. Clair, the inland lakes) are left
at 0, and the water shader shades those by distance from shore. NOAA's own bathymetry grids would be finer: if
www.ngdc.noaa.gov can be reached, they can replace this.
  python3 tools/depth.py"""
import json, math, pathlib
import numpy as np
from PIL import Image, ImageDraw

root = pathlib.Path(__file__).resolve().parent.parent
M = json.loads((root / 'data' / 'map.json').read_text())
KX, KY, W0, N0 = M['KX'], M['KY'], M['W'], M['N']
K = 2  # cells to the km
w, h = int(math.ceil(M['width'] * K)), int(math.ceil(M['height'] * K))
ll = lambda lat, lon: ((lon - W0) * KX * K, (N0 - lat) * KY * K)

# (lat, lon, feet)
SOUNDINGS = {
  'Lake Huron': [
    (45.650, -83.347, 400), (45.024, -82.107, 720), (44.901, -81.912, 520), (44.696, -82.108, 420), (44.818, -82.539, 250),  # north basin, the deep hole, the mid-lake ridge
    (44.386, -82.845, 200), (44.111, -82.223, 300), (44.188, -83.217, 150), (43.995, -83.501, 40), (45.003, -83.083, 180),   # south basin, the trench, Saginaw Bay
    (45.410, -82.603, 300), (43.166, -82.298, 60), (44.376, -81.814, 250), (45.798, -82.655, 150), (43.845, -83.102, 150),
    (45.735, -81.193, 150), (44.939, -80.458, 350), (45.289, -80.553, 420), (45.531, -80.809, 300), (45.362, -80.293, 200),  # Georgian Bay
    (45.953, -81.224, 80), (44.759, -80.273, 150),
    (46.050, -82.600, 90), (46.000, -82.100, 110), (46.080, -83.200, 70), (46.150, -83.600, 50),                              # the North Channel
    (43.650, -82.250, 200), (43.420, -82.300, 130), (43.850, -82.600, 190), (43.950, -82.050, 230), (44.600, -81.650, 160)],  # the south basin and the Ontario shore
  'Lake Ontario': [
    (43.517, -77.279, 790), (43.520, -77.539, 520), (43.549, -78.264, 600), (43.337, -79.480, 150), (43.502, -79.105, 300),
    (43.879, -78.349, 150), (43.968, -76.598, 60), (43.324, -77.571, 200)],
}

def lake_mask(lake):
    acc = np.zeros((h, w), bool)
    for r in lake['rings']:
        im = Image.new('1', (w, h), 0); ImageDraw.Draw(im).polygon([(x * K, y * K) for x, y in r], fill=1); acc ^= np.asarray(im, bool)
    return acc

def shore_distance(m, steps):
    """Distance to the shore in cells, by eroding the water one cell at a time"""
    d = np.zeros(m.shape, np.float32); cur = m.copy()
    for i in range(steps):
        nxt = cur.copy(); nxt[1:] &= cur[:-1]; nxt[:-1] &= cur[1:]; nxt[:, 1:] &= cur[:, :-1]; nxt[:, :-1] &= cur[:, 1:]
        d[cur & ~nxt] = i + .5; cur = nxt
        if not cur.any(): break
    d[cur] = steps
    return d

lakes = {l['name']: l for l in M['lakes'] + M['inland'] if l.get('name')}
depth = np.zeros((h, w), np.float32)
ys, xs = np.mgrid[0:h, 0:w]
for name, pts in SOUNDINGS.items():
    m = lake_mask(lakes[name]); dist = shore_distance(m, 60) / K  # km
    P = np.array([(*ll(la, lo), ft * .3048) for la, lo, ft in pts])
    sig = (28 if name == 'Lake Huron' else 20) * K
    num = np.zeros((h, w)); den = np.zeros((h, w))
    for px, py, d in P:
        r2 = (xs - px) ** 2 + (ys - py) ** 2
        wt = np.exp(-r2 / (2 * sig * sig)) + 1e-4 / (1 + r2 / (K * K))
        num += wt * d; den += wt
    D = num / np.maximum(den, 1e-12)
    D *= 1 - np.exp(-dist / 3.5)  # shoaling to the shore
    depth[m] = D[m]
# close the odd one-cell seam where two coastline rings meet: a dry cell with water soundings all round takes theirs
for _ in range(2):
    z = depth == 0; nb = np.zeros((h, w)); cnt = np.zeros((h, w))
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                sh = np.roll(np.roll(depth, dy, 0), dx, 1); nb += sh; cnt += sh > 0
    fill = z & (cnt >= 6); depth[fill] = nb[fill] / cnt[fill]
q = np.clip(np.round(depth), 0, 255).astype(np.uint8)
Image.fromarray(q, 'L').save(root / 'data' / 'depth.png', optimize=True)
print('depth.png', q.shape[::-1], (root / 'data' / 'depth.png').stat().st_size // 1024, 'KB, deepest', int(q.max()), 'm')
