# Debug: draw a raw town file as a top-down SVG with a 250 m grid in local metres (x east, y north from the SW corner).
#   python3 tools/townsvg.py data/towns_raw/parrysound.json out.svg
import json, sys, math, html
d = json.load(open(sys.argv[1])); s, w, n, e = d['bbox']
lat0 = (s + n) / 2; KX = 111320 * math.cos(math.radians(lat0)); KY = 110540
W, H = (e - w) * KX, (n - s) * KY
P = lambda lon, lat: ((lon - w) * KX, H - (lat - s) * KY)
def rings(g):
    t = g['type']; c = g['coordinates']
    if t == 'Polygon': return [c]
    if t == 'MultiPolygon': return c
    return []
def lines(g):
    t = g['type']; c = g['coordinates']
    if t == 'LineString': return [c]
    if t == 'MultiLineString': return c
    if t == 'Polygon': return c
    if t == 'MultiPolygon': return [r for p in c for r in p]
    return []
def path(rs): return ' '.join('M' + ' L'.join(f'{P(*pt)[0]:.1f},{P(*pt)[1]:.1f}' for pt in r) + 'Z' for poly in rs for r in poly)
crop = [float(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0, 0, W, H]  # x0,y0,x1,y1 in local metres (y north)
vb = f'{crop[0]:.0f} {H - crop[3]:.0f} {crop[2] - crop[0]:.0f} {crop[3] - crop[1]:.0f}'
out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{crop[2] - crop[0]:.0f}" height="{crop[3] - crop[1]:.0f}" viewBox="{vb}" style="background:#e9e3cf">']
for x in d.get('land_use', []):
    col = {'park': '#b9d39a', 'residential': '#e2d6c0', 'developed': '#d0c8c8', 'cemetery': '#a9c49a', 'transportation': '#ddd', 'protected': '#c9dcb0'}.get(x['subtype'], '#dcd7c4')
    out.append(f'<path d="{path(rings(x["geom"]))}" fill="{col}" fill-rule="evenodd"/>')
for x in d.get('water', []):
    if x['geom']['type'] in ('Polygon', 'MultiPolygon'): out.append(f'<path d="{path(rings(x["geom"]))}" fill="#8fbfdf" fill-rule="evenodd"/>')
    else:
        for l in lines(x['geom']): out.append('<polyline fill="none" stroke="#6aa6cf" stroke-width="3" points="' + ' '.join(f'{P(*pt)[0]:.1f},{P(*pt)[1]:.1f}' for pt in l) + '"/>')
for x in d.get('segment', []):
    sw = {'motorway': 9, 'trunk': 8, 'primary': 7, 'secondary': 6, 'tertiary': 5, 'residential': 4, 'service': 2, 'footway': 1, 'path': 1}.get(x['class'], 2)
    col = '#222' if x['subtype'] == 'rail' else '#fff' if x['class'] not in ('footway', 'path', 'steps', 'cycleway') else '#c9b'
    if x['subtype'] == 'rail': sw = 3
    for l in lines(x['geom']): out.append(f'<polyline fill="none" stroke="{col}" stroke-width="{sw}" points="' + ' '.join(f'{P(*pt)[0]:.1f},{P(*pt)[1]:.1f}' for pt in l) + '"/>')
for x in d.get('infrastructure', []):
    if x['subtype'] in ('pier', 'bridge'):
        col = '#8a5a2a' if x['subtype'] == 'pier' else '#c03'
        g = x['geom']
        if g['type'] in ('Polygon', 'MultiPolygon'): out.append(f'<path d="{path(rings(g))}" fill="{col}" opacity=".8"/>')
        else:
            for l in lines(g): out.append(f'<polyline fill="none" stroke="{col}" stroke-width="4" points="' + ' '.join(f'{P(*pt)[0]:.1f},{P(*pt)[1]:.1f}' for pt in l) + '"/>')
for x in d.get('building', []):
    col = {'residential': '#a08070', 'commercial': '#c05050', 'industrial': '#707090', 'religious': '#e0b030', 'civic': '#5080c0', 'education': '#50a080'}.get(x.get('subtype'), '#888')
    out.append(f'<path d="{path(rings(x["geom"]))}" fill="{col}"/>')
step = 100 if len(sys.argv) > 3 else 250
for gx in range(0, int(W) + 1, step):
    out.append(f'<line x1="{gx}" y1="0" x2="{gx}" y2="{H:.0f}" stroke="#000" stroke-opacity=".25" stroke-width="{2 if gx % 1000 == 0 else 1}"/><text x="{gx + 3}" y="{H - crop[3] + 14:.0f}" font-size="14">{gx}</text>')
for gy in range(0, int(H) + 1, step):
    out.append(f'<line x1="0" y1="{H - gy:.0f}" x2="{W:.0f}" y2="{H - gy:.0f}" stroke="#000" stroke-opacity=".25" stroke-width="{2 if gy % 1000 == 0 else 1}"/><text x="{crop[0] + 3:.0f}" y="{H - gy - 3:.0f}" font-size="14">{gy}</text>')
for x in d.get('water', []) + d.get('building', []):
    if x.get('name') and x.get('subtype') in ('physical', 'religious', 'civic', 'river', 'lake', 'education', 'industrial'):
        c = x['geom']['coordinates']
        while isinstance(c[0], list): c = c[0]
        px, py = P(*c)
        out.append(f'<text x="{px:.0f}" y="{py:.0f}" font-size="16" fill="#003">{html.escape(x["name"][:30])}</text>')
out.append('</svg>')
open(sys.argv[2], 'w').write('\n'.join(out))
print(f'{W:.0f} x {H:.0f} m')
