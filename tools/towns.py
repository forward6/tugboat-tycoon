# Fetch present-day map data for the harbour towns from Overture Maps (OpenStreetMap and partners, ODbL)
# and save one raw JSON per town in data/towns_raw/. Reads only the parquet row groups that cover each town.
#   python3 tools/towns.py [town ...]
import io, os, sys, json, math, time, requests
from concurrent.futures import ThreadPoolExecutor
import pyarrow.parquet as pq
import shapely, shapely.ops
from shapely.geometry import box, mapping

RELEASE = 'release/2026-10-21.0'
BUCKET = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com'
CA = '/root/.ccr/ca-bundle.crt'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'towns_raw')

# south, west, north, east
TOWNS = {
    'parrysound':  (45.325, -80.070, 45.362, -80.005),
    'collingwood': (44.485, -80.245, 44.515, -80.190),
    'owensound':   (44.550, -80.965, 44.590, -80.920),
    'midland':     (44.740, -79.905, 44.790, -79.840),
    'penetang':    (44.765, -79.950, 44.810, -79.910),
    'mcnicoll':    (44.740, -79.830, 44.765, -79.790),
    'depot':       (45.298, -80.130, 45.332, -80.075),
    'meaford':     (44.595, -80.610, 44.620, -80.575),
    'wiarton':     (44.730, -81.155, 44.755, -81.120),
    'southampton': (44.485, -81.390, 44.510, -81.355),
    'gateway':     (42.960, -82.450, 43.010, -82.400),
    'baycity':     (43.585, -83.905, 43.635, -83.855),
}
TYPES = {
    'building':       ('buildings', ['geometry', 'class', 'subtype', 'height', 'num_floors', 'names', 'roof_shape']),
    'segment':        ('transportation', ['geometry', 'subtype', 'class', 'names', 'road_flags', 'rail_flags', 'level_rules']),
    'water':          ('base', ['geometry', 'subtype', 'class', 'names', 'is_intermittent']),
    'land_use':       ('base', ['geometry', 'subtype', 'class', 'names']),
    'infrastructure': ('base', ['geometry', 'subtype', 'class', 'names', 'height']),
}

S = requests.Session(); S.verify = CA if os.path.exists(CA) else True
class RangeFile(io.RawIOBase):
    """A seekable file over HTTP range requests, so pyarrow reads only what it needs."""
    def __init__(self, url, size=None):
        self.url, self.pos = url, 0
        self.size = size or int(S.head(url, timeout=60).headers['Content-Length'])
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos
    def read(self, n=-1):
        if n < 0: n = self.size - self.pos
        if n == 0 or self.pos >= self.size: return b''
        end = min(self.size, self.pos + n) - 1
        for attempt in range(4):
            try:
                r = S.get(self.url, headers={'Range': f'bytes={self.pos}-{end}'}, timeout=180); r.raise_for_status(); break
            except Exception:
                if attempt == 3: raise
                time.sleep(2 ** attempt)
        self.pos += len(r.content); return r.content
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)

def list_files(theme, typ):
    out, token = [], None
    while True:
        url = f'{BUCKET}/?list-type=2&prefix={RELEASE}/theme={theme}/type={typ}/' + (f'&continuation-token={requests.utils.quote(token)}' if token else '')
        x = S.get(url, timeout=60).text
        import re
        out += [(k, int(z)) for k, z in re.findall(r'<Key>([^<]+)</Key>.*?<Size>(\d+)</Size>', x)]
        m = re.search(r'<NextContinuationToken>([^<]+)</NextContinuationToken>', x)
        if not m: return out
        token = m.group(1)

def hits(meta, boxes):
    """Row groups whose bbox statistics overlap any town box."""
    cols = {meta.schema.column(i).path: i for i in range(meta.num_columns)}
    res = []
    for g in range(meta.num_row_groups):
        rg = meta.row_group(g)
        st = lambda c: rg.column(cols[c]).statistics
        x0, x1, y0, y1 = st('bbox.xmin').min, st('bbox.xmax').max, st('bbox.ymin').min, st('bbox.ymax').max
        towns = [t for t, (s, w, n, e) in boxes.items() if not (x1 < w or x0 > e or y1 < s or y0 > n)]
        if towns: res.append((g, towns))
    return res

def fetch(typ, boxes):
    theme, cols = TYPES[typ]
    files = list_files(theme, typ)
    def scan(kf):
        k, z = kf
        f = RangeFile(f'{BUCKET}/{k}', z)
        return k, z, hits(pq.ParquetFile(f).metadata, boxes)
    with ThreadPoolExecutor(16) as ex: scanned = list(ex.map(scan, files))
    jobs = [(k, z, g, towns) for k, z, hs in scanned for g, towns in hs]
    print(f'{typ}: {len(files)} files, {len(jobs)} row groups to read', flush=True)
    def read(job):
        k, z, g, towns = job
        pf = pq.ParquetFile(RangeFile(f'{BUCKET}/{k}', z))
        tab = pf.read_row_group(g, columns=cols + ['bbox']).to_pylist()
        out = {t: [] for t in towns}
        for row in tab:
            b = row['bbox']
            for t in towns:
                s, w, n, e = boxes[t]
                if b['xmax'] < w or b['xmin'] > e or b['ymax'] < s or b['ymin'] > n: continue
                out[t].append(row)
        return out
    res = {t: [] for t in boxes}
    with ThreadPoolExecutor(8) as ex:
        for out in ex.map(read, jobs):
            for t, rows in out.items(): res[t] += rows
    return res

def flags(lst):
    vals = set()
    for x in lst or []:
        for v in (x.get('values') or []): vals.add(v)
    return sorted(vals)

def spans(row):
    """The stretches of a segment (as fractions of its length) that are bridges or raised."""
    out = []
    for key in ('road_flags', 'rail_flags'):
        for x in row.get(key) or []:
            if 'is_bridge' in (x.get('values') or []): out.append(list(x.get('between') or [0, 1]))
    for lr in row.get('level_rules') or []:
        if (lr or {}).get('value', 0) > 0: out.append(list(lr.get('between') or [0, 1]))
    return out

def main():
    args = sys.argv[1:]
    only = [a[7:].split(',') for a in args if a.startswith('--only=')]
    want = [a for a in args if not a.startswith('--')] or list(TOWNS)
    boxes = {t: TOWNS[t] for t in want}
    os.makedirs(OUT, exist_ok=True)
    data = {}
    for t in boxes:
        f = os.path.join(OUT, t + '.json')
        data[t] = json.load(open(f)) if only and os.path.exists(f) else {'bbox': boxes[t]}
    for typ in (only[0] if only else TYPES):
        res = fetch(typ, boxes)
        for t, rows in res.items():
            s, w, n, e = boxes[t]; clipbox = box(w, s, e, n)
            items = []
            for r in rows:
                g = shapely.from_wkb(r['geometry'])
                if typ in ('water', 'land_use') and not g.is_valid: g = shapely.make_valid(g)
                g = shapely.clip_by_rect(g, w, s, e, n) if typ != 'building' else g
                if g.is_empty: continue
                it = {'geom': mapping(g), 'subtype': r.get('subtype'), 'class': r.get('class')}
                nm = (r.get('names') or {}).get('primary')
                if nm: it['name'] = nm
                for k in ('height', 'num_floors', 'roof_shape', 'is_intermittent'):
                    if r.get(k) is not None: it[k] = r[k]
                if typ == 'segment':
                    f = flags(r.get('road_flags')) + flags(r.get('rail_flags'))
                    if f: it['flags'] = f
                    b = spans(r)
                    if b:
                        # a bridge span is given along the unclipped segment; keep the span as map coordinates instead
                        full = shapely.from_wkb(r['geometry'])
                        it['bridges'] = [mapping(shapely.ops.substring(full, a, z, normalized=True)) for a, z in b]
                items.append(it)
            data[t][typ] = items
            print(f'  {t}: {len(items)} {typ}', flush=True)
    for t, d in data.items():
        with open(os.path.join(OUT, t + '.json'), 'w') as f: json.dump(d, f)
    print('done')

if __name__ == '__main__':
    main()
