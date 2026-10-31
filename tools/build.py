"""Inline the map data into the game page: src/game.html + src/plans.js + data/map.json + data/routes.json + data/towns.json -> index.html"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'src' / 'game.html').read_text()
data = json.loads((root / 'data' / 'map.json').read_text())
routes = json.loads((root / 'data' / 'routes.json').read_text())
out = src.replace('/*MAP_DATA*/null', json.dumps(data, separators=(',', ':')))
assert out != src, 'map placeholder not found'
before = out
out = out.replace('/*NET_ROUTES*/null', json.dumps(routes, separators=(',', ':')))
assert out != before, 'routes placeholder not found'
towns = root / 'data' / 'towns.json'
before = out
out = out.replace('/*TOWN_DATA*/null', towns.read_text() if towns.exists() else 'null')
assert out != before, 'town data placeholder not found'
before = out
out = out.replace('/*PLANS*/', (root / 'src' / 'plans.js').read_text())
assert out != before, 'plans placeholder not found'
# the lie of the land (tools/relief.py)
import base64
before = out
rel = root / 'data' / 'relief.png'
out = out.replace("/*RELIEF_PNG*/''", repr('data:image/png;base64,' + base64.b64encode(rel.read_bytes()).decode()) if rel.exists() else "''")
assert out != before, 'relief placeholder not found'
before = out
con = root / 'data' / 'contours.txt'
out = out.replace("/*CONTOURS*/''", repr(con.read_text().strip()) if con.exists() else "''")
assert out != before, 'contours placeholder not found'
before = out
dep = root / 'data' / 'depth.png'
out = out.replace("/*DEPTH_PNG*/''", repr('data:image/png;base64,' + base64.b64encode(dep.read_bytes()).decode()) if dep.exists() else "''")
assert out != before, 'depth placeholder not found'
(root / 'index.html').write_text(out)
print('built index.html', len(out), 'bytes')
