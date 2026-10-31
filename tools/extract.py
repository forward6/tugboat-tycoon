import json, sys, math
NE = sys.argv[1]
OUT = sys.argv[2]
W,E,S,N=-84.2,-77.0,42.75,47.1
LAT0=45.3
KX=111.2*math.cos(math.radians(LAT0)); KY=111.2
def proj(p): return [round((p[0]-W)*KX,2), round((N-p[1])*KY,2)]
def inside(r, pad=0.2):
    return any(W-pad<=p[0]<=E+pad and S-pad<=p[1]<=N+pad for p in r)
# douglas-peucker
def dp(pts, eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]
    dx,dy=b[0]-a[0],b[1]-a[1]; L=math.hypot(dx,dy) or 1e-9
    idx,dm=0,0
    for i in range(1,len(pts)-1):
        p=pts[i]
        d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L
        if d>dm: idx,dm=i,d
    if dm>eps:
        return dp(pts[:idx+1],eps)[:-1]+dp(pts[idx:],eps)
    return [a,b]
def ring_dp(r,eps):
    if r[0]==r[-1]: r=r[:-1]
    h=len(r)//2
    a=dp(r[:h+1],eps); b=dp(r[h:]+[r[0]],eps)
    return a[:-1]+b[:-1]
out={'borders':[],'W':W,'E':E,'S':S,'N':N,'KX':KX,'KY':KY,'width':round((E-W)*KX,2),'height':round((N-S)*KY,2),'lakes':[],'inland':[],'rivers':[]}
big={'Lake Huron'}
for fn in ['lakes.geojson','lakes_na.geojson']:
    d=json.load(open(f'{NE}/{fn}'))
    for f in d['features']:
        g=f['geometry']
        if not g: continue
        name=f['properties'].get('name')
        if name in ('North Channel','Georgian Bay','Saginaw Bay','Whitefish Bay','Lake Superior'): continue  # parts of bigger lakes, or off the map
        polys = g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        for poly in polys:
            if not inside(poly[0]): continue
            rings=[ring_dp([proj(p) for p in r],0.15) for r in poly]
            rings=[r for r in rings if len(r)>=4]
            (out['lakes'] if name in big else out['inland']).append({'name':name,'rings':rings})
seen=set()
for fn in ['rivers_na.geojson','rivers.geojson']:
    d=json.load(open(f'{NE}/{fn}'))
    for f in d['features']:
        g=f['geometry']
        if not g: continue
        name=f['properties'].get('name')
        lines = g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
        for l in lines:
            if not inside(l,0): continue
            key=(name,len(l))
            if key in seen: continue
            seen.add(key)
            out['rivers'].append({'name':name,'pts':dp([proj(p) for p in l],0.2)})
for fn,kind in [('ne_10m_admin_0_boundary_lines_land.geojson','country'),('ne_10m_admin_1_states_provinces_lines.geojson','province')]:
    d=json.load(open(f'{NE}/{fn}'))
    for f in d['features']:
        g=f['geometry']
        if not g: continue
        nm=f['properties'].get('name') or ''
        if kind=='province' and 'Ontario' not in nm: continue
        lines = g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
        for l in lines:
            pts=[p for p in l if W-.6<=p[0]<=E+.6 and S-.6<=p[1]<=N+.6]
            if len(pts)>1: out['borders'].append({'kind':kind,'pts':dp([proj(p) for p in pts],0.3)})
json.dump(out,open(OUT,'w'))
print('borders',[(b['kind'],len(b['pts'])) for b in out['borders']])
print('lakes',[(l['name'],[len(r) for r in l['rings']]) for l in out['lakes']])
print('inland',[(l['name'],sum(len(r) for r in l['rings'])) for l in out['inland']])
print('rivers',len(out['rivers']), sum(len(r['pts']) for r in out['rivers']))
print(out['width'],out['height'])
