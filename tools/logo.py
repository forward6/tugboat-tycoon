"""The Tugboat Tycoon logo: a steam tug towing past a windswept pine on a granite islet, inside a rope ring.

  python3 tools/logo.py            -> assets/logo.svg (the badge), assets/logo-lockup.svg (badge, name and line),
                                      src/intro.html (the opening animation the build puts into the game page)

The lettering is drawn from the game's own typefaces (IM Fell English SC for the name, Alegreya Sans for the small line),
turned into outlines so it looks the same everywhere and needs no font to load. Both are under the SIL Open Font Licence.
Needs fonttools and uharfbuzz (pip install fonttools uharfbuzz); the fonts are fetched from Google Fonts once and kept
in ~/.cache/tugboat-fonts.
"""
import math, pathlib, re, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
CACHE = pathlib.Path.home() / '.cache' / 'tugboat-fonts'

# ---- the palette: the game's own ----
INK, PAPER, MAGENTA, RED, GOLD = '#1c2731', '#fbf7ec', '#a3306a', '#ab352d', '#c2b183'
SEA1, SEA2, SMOKE = '#5e98c0', '#2f5d80', '#9aa6ab'
ROPE, ROPE_DARK = '#d2bf8a', '#8c7743'


# ---- lettering as outlines ----
def font(family):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / (re.sub(r'[^A-Za-z0-9]', '', family) + '.ttf')
    if not f.exists():
        req = urllib.request.Request(f'https://fonts.googleapis.com/css2?family={family}', headers={'User-Agent': 'Mozilla/4.0'})
        css = urllib.request.urlopen(req).read().decode()
        f.write_bytes(urllib.request.urlopen(re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css).group(1)).read())
    return f


def text_path(text, family, size, x, y, anchor='middle', spacing=0.0):
    """The text as one SVG path, set with the font's kerning; returns (path d, width)."""
    import uharfbuzz as hb
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    fp = font(family)
    blob = hb.Blob.from_file_path(str(fp)); face = hb.Face(blob); hfont = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(hfont, buf, {'kern': True, 'liga': True})
    tt = TTFont(str(fp)); gs = tt.getGlyphSet(); order = tt.getGlyphOrder(); upm = tt['head'].unitsPerEm
    s = size / upm
    width = sum(p.x_advance for p in buf.glyph_positions) * s + spacing * (len(text) - 1)
    pen = SVGPathPen(gs, ntos=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.'))
    cx = x - (width / 2 if anchor == 'middle' else 0)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        gs[order[info.codepoint]].draw(TransformPen(pen, (s, 0, 0, -s, cx + pos.x_offset * s, y - pos.y_offset * s)))
        cx += pos.x_advance * s + spacing
    return pen.getCommands(), width


# ---- the badge, drawn on a 240 x 240 square with its centre at 120, 120 ----
C, R_IN, R_OUT, HORIZON = 120, 100, 114, 146


def rope():
    """A rope ring: the strands' twists as short slanted strokes between two lines."""
    out = [f'<circle cx="{C}" cy="{C}" r="{(R_IN + R_OUT) / 2}" fill="none" stroke="{ROPE}" stroke-width="{R_OUT - R_IN}"/>']
    n, twists = 64, []
    for k in range(n):
        a = 2 * math.pi * k / n
        def pt(r, da):
            return C + r * math.cos(a + da), C + r * math.sin(a + da)
        (x1, y1), (xm, ym), (x2, y2) = pt(R_IN + 1, -0.05), pt((R_IN + R_OUT) / 2, 0.0), pt(R_OUT - 1, 0.05)
        twists.append(f'M{x1:.1f},{y1:.1f}Q{xm + 1.2 * math.cos(a + 1.6):.1f},{ym + 1.2 * math.sin(a + 1.6):.1f} {x2:.1f},{y2:.1f}')
    out.append(f'<path d="{"".join(twists)}" fill="none" stroke="{ROPE_DARK}" stroke-width="2.4" stroke-linecap="round"/>')
    out.append(f'<circle cx="{C}" cy="{C}" r="{R_OUT}" fill="none" stroke="{INK}" stroke-width="2.5"/>')
    out.append(f'<circle cx="{C}" cy="{C}" r="{R_IN}" fill="none" stroke="{INK}" stroke-width="2.5"/>')
    return ''.join(out)


DEFS = f'''<defs>
  <linearGradient id="ttSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ecd6"/><stop offset=".72" stop-color="#f3dcb2"/><stop offset="1" stop-color="#efc792"/></linearGradient>
  <linearGradient id="ttSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SEA1}"/><stop offset="1" stop-color="{SEA2}"/></linearGradient>
  <radialGradient id="ttSun"><stop offset=".55" stop-color="#e7a74a"/><stop offset="1" stop-color="#e7a74a" stop-opacity="0"/></radialGradient>
  <clipPath id="ttDisk"><circle cx="{C}" cy="{C}" r="{R_IN}"/></clipPath>
</defs>'''

SKY = f'<rect x="0" y="0" width="240" height="{HORIZON + 1}" fill="url(#ttSky)"/>'
SUN_X = 156
SUN = (f'<circle cx="{SUN_X}" cy="{HORIZON - 2}" r="34" fill="url(#ttSun)" opacity=".55"/>'
       f'<circle cx="{SUN_X}" cy="{HORIZON - 2}" r="19" fill="#e9a443"/>')
FAR = (f'<path d="M14,{HORIZON + 1}V141Q30,136 46,139Q62,133 80,138Q94,135 104,140L112,{HORIZON + 1}Z" fill="#7d8f96" opacity=".75"/>'
       f'<path d="M196,{HORIZON + 1}Q206,138 220,140Q228,139 236,141V{HORIZON + 1}Z" fill="#7d8f96" opacity=".75"/>')
SEA = f'<rect x="0" y="{HORIZON}" width="240" height="{240 - HORIZON}" fill="url(#ttSea)"/>'
GLINT = ''.join(f'<path d="M{SUN_X - w},{y}h{2 * w}" stroke="#f0c27a" stroke-width="1.6" stroke-linecap="round" opacity="{o}"/>'
                for w, y, o in [(13, 150, .9), (9, 154, .75), (11, 158.5, .6), (6, 163, .5), (8, 168, .35)])


def waves(x0=0, width=240):
    """Light lines on the water; drawn twice as wide in the animation, so it can slide without a seam."""
    rows = [(176, .55, 0), (188, .45, 14), (200, .4, 6), (212, .35, 20), (224, .3, 10)]
    out = []
    for y, o, off in rows:
        d = ''.join(f'M{x},{y}q5,-3 10,0t10,0' for x in range(x0 - 40 + off, x0 + width + 40, 46))
        out.append(f'<path d="{d}" fill="none" stroke="{PAPER}" stroke-width="1.6" stroke-linecap="round" opacity="{o}"/>')
    return ''.join(out)


# a granite islet and a white pine flagged by the west wind: its branches stream east, to the right
def smooth(pts, closed=True):
    """A smooth path through the points (Catmull-Rom, as cubic Beziers)."""
    n, d = len(pts), [f'M{pts[0][0]:.1f},{pts[0][1]:.1f}']
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        if not closed: p0, p3 = pts[max(i - 1, 0)], pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f'C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}')
    return ''.join(d) + ('Z' if closed else '')


def bez(t, a, b, c, e):
    u = 1 - t
    return tuple(u ** 3 * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t ** 3 * e[i] for i in (0, 1))


TRUNK = ((194, 140), (192, 120), (184, 104), (189, 76))  # base to crown, leaning with the wind's years


def trunk_x(y):
    best = min((abs(bez(t / 60, *TRUNK)[1] - y), bez(t / 60, *TRUNK)[0]) for t in range(61))
    return best[1]


def pine():
    import random
    rnd = random.Random(7)
    # the trunk: a tapering shape round its curved centre line
    left, right = [], []
    for k in range(25):
        t = k / 24; x, y = bez(t, *TRUNK); w = 4.6 - 3.6 * t ** .8
        left.append((x - w / 2, y)); right.append((x + w / 2, y))
    out = [f'<path d="{smooth(left + right[::-1])}" fill="{INK}"/>']
    # the needle masses: flat, ragged underneath, long to the lee side and short to the weather side
    for y, lee, weather, h in [(78, 13, 3, 4.2), (86, 25, 4, 6.2), (96, 35, 10, 7.6), (104, 24, 6, 5.4), (113, 29, 4, 6.4), (123, 14, 2, 4)]:
        tx = trunk_x(y); a, b = tx - weather, tx + lee
        top = [(a + (b - a) * i / 7, y - h * (.45 + .3 * math.sin(math.pi * i / 7.6)) + rnd.uniform(-.6, .6)) for i in range(8)]
        tip = [(b + 2.5, y - h * .25)]
        lobes = [(b - (b - a) * i / 6, y + h * (.15 + .4 * abs(math.sin(math.pi * i * 1.5 / 6 + .4))) + rnd.uniform(-.5, .5)) for i in range(1, 6)]
        out.append(f'<path d="{smooth(top + tip + lobes)}" fill="{INK}"/>')
        out.append(f'<path d="M{tx:.1f},{y + 1:.1f}L{b - 4:.1f},{y - .5:.1f}" stroke="{INK}" stroke-width="1.4"/>')
    return ''.join(out)


ISLE = (f'<path d="M154,{HORIZON + 2}Q161,141 170,139Q181,133 194,135Q207,134 215,139Q224,143 230,{HORIZON + 2}Z" fill="{INK}"/>'
        f'<path d="M171,140.5Q181,136 192,137" fill="none" stroke="#56616b" stroke-width="1.2" stroke-linecap="round"/>')


def tufts():
    return pine()


# two gulls, high up
GULLS = (f'<path d="M116,64q3.5,-3.5 7,0q3.5,-3.5 7,0" fill="none" stroke="{INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
         f'<path d="M136,55q2.5,-2.5 5,0q2.5,-2.5 5,0" fill="none" stroke="{INK}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>')


# the tug, heading east under a full head of steam, with her towline running back out of the picture
TOWLINE = f'<path d="M50,151C38,155 26,160 6,163" fill="none" stroke="{ROPE_DARK}" stroke-width="1.8"/>'
TUG = (
    # wake and bow wave
    f'<path d="M48,161q-8,2-18,1M50,164q-12,3-26,2" fill="none" stroke="{PAPER}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>'
    f'<path d="M131,158q6,1 10,4q-6,0-11-1z" fill="{PAPER}" opacity=".9"/>'
    # mast and pennant
    f'<path d="M120,148V113" stroke="{INK}" stroke-width="2"/><path d="M121,114l12,3.5-12,3.5z" fill="{MAGENTA}"/>'
    # funnel: black, with the house band in magenta
    f'<path d="M73,139L75,109H86L86,139Z" fill="{INK}"/><path d="M74.5,115.5H86V122H74.1Z" fill="{MAGENTA}"/>'
    f'<path d="M74.6,111H86" stroke="#56616b" stroke-width="1"/>'
    # deckhouse and pilothouse
    f'<rect x="60" y="136" width="42" height="13" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>'
    f'<rect x="99" y="125" width="17" height="15" rx="1.5" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>'
    f'<path d="M97,125H118" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    f'<rect x="102" y="129" width="4" height="4.5" fill="{INK}"/><rect x="109" y="129" width="4" height="4.5" fill="{INK}"/>'
    f'<rect x="65" y="140" width="4" height="4" fill="{INK}"/><rect x="73" y="140" width="4" height="4" fill="{INK}"/><rect x="88" y="140" width="4" height="4" fill="{INK}"/>'
    # hull: a low counter stern, sheer rising to the bow; red boot-top at the waterline
    f'<path d="M44,149Q47,147 52,148L120,147Q130,146 136,142L132,157Q130,161 124,162L56,162Q47,162 44,149Z" fill="{INK}"/>'
    f'<path d="M48,158.2Q52,160 58,160L126,160Q130,159.5 132.2,157" fill="none" stroke="{RED}" stroke-width="2.4"/>'
    f'<path d="M52,151.5L130,149.8" stroke="{GOLD}" stroke-width="1" opacity=".8"/>'
)
PUFFS = [(80, 101, 7), (70, 92, 9.5), (57, 85, 11.5)]  # smoke, drifting back from the funnel
# the tug is drawn a little larger than her lines above, her waterline kept where it is
TUG_K, TUG_DX, TUG_DY = 1.12, -5, 160 - 1.12 * 160
TUG_T = f'matrix({TUG_K} 0 0 {TUG_K} {TUG_DX} {TUG_DY:.2f})'
FUNNEL_TOP = (80.5 * TUG_K + TUG_DX, 105 * TUG_K + TUG_DY)  # where the smoke leaves the funnel, on the badge


def puff(x, y, r):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{SMOKE}"/><circle cx="{x + r * .35}" cy="{y - r * .4}" r="{r * .7}" fill="#b4bdc1"/>'


def badge(inner_extra=''):
    disk = (f'<g clip-path="url(#ttDisk)">{SKY}{GULLS}{SUN}{FAR}{SEA}{GLINT}{waves()}{ISLE}{tufts()}'
            f'<g transform="{TUG_T}">{TOWLINE}{"".join(puff(*p) for p in PUFFS)}{TUG}</g>{inner_extra}</g>')
    return f'{DEFS}<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{PAPER}"/>{disk}{rope()}'


def svg(body, w=240, h=240, vb=None, title='Tugboat Tycoon'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb or f"0 0 {w} {h}"}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


NAME = 'Tugboat Tycoon'
LINE = 'GEORGIAN BAY · FROM 1870'


def lockup_parts(ink=INK, sub='#56616b'):
    name_d, name_w = text_path(NAME, 'IM+Fell+English+SC', 44, 0, 0, anchor='start')
    line_d, line_w = text_path(LINE, 'Alegreya+Sans:wght@500', 12, 0, 0, anchor='start', spacing=2.2)
    return name_d, name_w, line_d, line_w


# ---- the icons: the badge simplified, so it still reads at the size of a home-screen icon or a browser tab ----
NAVY = INK


def rope_bold(n=28, twist_w=4.4, line_w=3.8, twists=True):
    """The rope ring with fewer, heavier twists (or none, for the smallest icon)."""
    out = [f'<circle cx="{C}" cy="{C}" r="{(R_IN + R_OUT) / 2}" fill="none" stroke="{ROPE}" stroke-width="{R_OUT - R_IN}"/>']
    if twists:
        d = []
        for k in range(n):
            a = 2 * math.pi * k / n
            x1, y1 = C + (R_IN + 1.5) * math.cos(a - .07), C + (R_IN + 1.5) * math.sin(a - .07)
            x2, y2 = C + (R_OUT - 1.5) * math.cos(a + .07), C + (R_OUT - 1.5) * math.sin(a + .07)
            d.append(f'M{x1:.1f},{y1:.1f}L{x2:.1f},{y2:.1f}')
        out.append(f'<path d="{"".join(d)}" stroke="{ROPE_DARK}" stroke-width="{twist_w}" stroke-linecap="round"/>')
    out.append(f'<circle cx="{C}" cy="{C}" r="{R_OUT}" fill="none" stroke="{INK}" stroke-width="{line_w}"/>')
    out.append(f'<circle cx="{C}" cy="{C}" r="{R_IN}" fill="none" stroke="{INK}" stroke-width="{line_w}"/>')
    return ''.join(out)


def pine_bold():
    """The pine in four heavy tiers, on a thicker trunk."""
    left, right = [], []
    for k in range(25):
        t = k / 24; x, y = bez(t, *TRUNK); w = 6.5 - 4.5 * t ** .8
        left.append((x - w / 2, y)); right.append((x + w / 2, y))
    out = [f'<path d="{smooth(left + right[::-1])}" fill="{INK}"/>']
    for y, lee, weather, h in [(84, 22, 4, 9), (97, 33, 9, 10), (110, 27, 5, 9), (122, 15, 2, 7)]:
        tx = trunk_x(y); a, b = tx - weather, tx + lee
        top = [(a + (b - a) * i / 5, y - h * (.45 + .3 * math.sin(math.pi * i / 5.4))) for i in range(6)]
        lobes = [(b - (b - a) * i / 4, y + h * (.2 + .35 * abs(math.sin(math.pi * i * 1.4 / 4 + .4)))) for i in range(1, 4)]
        out.append(f'<path d="{smooth(top + [(b + 3, y - h * .25)] + lobes)}" fill="{INK}"/>')
    return ''.join(out)


def tug_at(k, cx, puffs=2, towline=False):
    """The tug scaled by k about her waterline, centred at cx, with some of her smoke."""
    dx, dy = cx - 90 * k, 160 - 160 * k
    return f'<g transform="matrix({k} 0 0 {k} {dx:.2f} {dy:.2f})">{TOWLINE if towline else ""}{"".join(puff(*p) for p in PUFFS[:puffs])}{TUG}</g>'


BOLD_WAVES = ''.join(f'<path d="{"".join(f"M{x},{y}q7,-4.5 14,0t14,0" for x in range(x0, 240, 64))}" fill="none" stroke="{PAPER}" stroke-width="3.2" stroke-linecap="round" opacity="{o}"/>'
                     for y, x0, o in [(184, 22, .5), (204, 50, .4)])


def icon_badge():
    """The home-screen badge: the same picture with less in it, and the tug larger."""
    disk = f'<g clip-path="url(#ttDisk)">{SKY}{SUN}{FAR}{SEA}{BOLD_WAVES}{ISLE}{pine_bold()}{tug_at(1.3, 100)}</g>'
    return f'{DEFS}<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{PAPER}"/>{disk}{rope_bold()}'


def tiny_badge():
    """The browser-tab badge: sky, sun, water and the tug, inside a plain ring."""
    sun = f'<circle cx="168" cy="{HORIZON - 2}" r="26" fill="#e9a443"/>'
    disk = f'<g clip-path="url(#ttDisk)">{SKY}{sun}{SEA}{ISLE}{tug_at(1.55, 104, puffs=1)}</g>'
    return f'{DEFS}<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{PAPER}"/>{disk}{rope_bold(twists=False, line_w=7)}'


def icon_svg(size=512, share=.88):
    """A square app icon: the badge on navy. For iPads, iPhones and browsers it fills 88%; Android's adaptive ("maskable")
    icon keeps it within the middle 80%, the circle Android always shows whatever shape it cuts the icon to."""
    k = share * size / (2 * R_OUT); t = size / 2 - C * k
    return svg(f'<rect width="{size}" height="{size}" fill="{NAVY}"/><g transform="matrix({k:.4f} 0 0 {k:.4f} {t:.2f} {t:.2f})">{icon_badge()}</g>', size, size)


def og_svg(name_d, name_w, line_d, line_w, W=1200, H=630):
    """The picture a link to the game shows when it is shared: the badge, the name and its line."""
    kb = 440 / (2 * R_OUT); bx, by = 330 - C * kb, H / 2 - C * kb
    kt = 540 / name_w; tx = 885 - name_w * kt / 2
    lk = kt * .95; lx = 885 - line_w * lk / 2
    return svg(f'<rect width="{W}" height="{H}" fill="{PAPER}"/><rect x="18" y="18" width="{W - 36}" height="{H - 36}" fill="none" stroke="{GOLD}" stroke-width="2"/>'
               f'<g transform="matrix({kb:.4f} 0 0 {kb:.4f} {bx:.1f} {by:.1f})">{badge()}</g>'
               f'<path transform="matrix({kt:.4f} 0 0 {kt:.4f} {tx:.1f} 318)" d="{name_d}" fill="{INK}"/>'
               f'<path d="M{885 - 110},350H{885 + 110}" stroke="{GOLD}" stroke-width="2"/>'
               f'<path transform="matrix({lk:.4f} 0 0 {lk:.4f} {lx:.1f} 392)" d="{line_d}" fill="#56616b"/>', W, H)


def main():
    (root / 'assets' / 'logo.svg').write_text(svg(badge()))
    (root / 'assets' / 'icon.svg').write_text(icon_svg())
    (root / 'assets' / 'icon-maskable.svg').write_text(icon_svg(share=.8))
    (root / 'assets' / 'favicon.svg').write_text(svg(tiny_badge()))
    name_d, name_w, line_d, line_w = lockup_parts()
    W = max(name_w, line_w, 240) + 24
    lock = (f'<g transform="translate({(W - 240) / 2},0)">{badge()}</g>'
            f'<path transform="translate({(W - name_w) / 2:.1f},288)" d="{name_d}" fill="{INK}"/>'
            f'<path d="M{W / 2 - 70},302H{W / 2 + 70}" stroke="{GOLD}" stroke-width="1.2"/>'
            f'<path transform="translate({(W - line_w) / 2:.1f},322)" d="{line_d}" fill="#56616b"/>')
    (root / 'assets' / 'logo-lockup.svg').write_text(svg(lock, vb=f'0 0 {W:.0f} 334'))
    (root / 'assets' / 'og.svg').write_text(og_svg(name_d, name_w, line_d, line_w))
    (root / 'src' / 'intro.html').write_text(intro_html(name_d, name_w, line_d, line_w))
    print('assets/logo.svg, logo-lockup.svg, icon.svg, icon-maskable.svg, favicon.svg, og.svg; src/intro.html (then node tools/icons.js for the PNGs)')


# ---- the opening animation: the badge in layers, each moved and faded by CSS alone (transforms and opacity, which the
# browser runs off the main thread), so it stays smooth while the game's big script loads and starts behind it.
# Browsers play no sound before the first tap, so the opening comes in two parts: while the game loads, the scene and the
# name build up and wait, with Loading and then a Tap to begin button; the tap brings the tug in, with the music and her
# whistle (assets/opening.mp3, made by tools/opening_sound.py to these times). Players with the sound off need no tap.
TOOT1, TOOT1_LEN = 0.90, 0.30   # seconds after the tap: her whistle, short then long
TOOT2, TOOT2_LEN = 1.36, 0.62
ARRIVE = 2.00                   # the music's arrival chord
TUG_IN = 1.25                   # how long she takes to sail in
WHISTLE_AT = (87 * TUG_K + TUG_DX, 111 * TUG_K + TUG_DY)  # the whistle, on the front of her funnel


def steam(x, y):
    return (f'<circle cx="{x:.1f}" cy="{y - 4:.1f}" r="4.2" fill="#fff"/><circle cx="{x + 2:.1f}" cy="{y - 8.5:.1f}" r="3.4" fill="#fff"/>'
            f'<circle cx="{x - 1:.1f}" cy="{y - 12:.1f}" r="2.6" fill="#fff" opacity=".9"/>')


def intro_html(name_d, name_w, line_d, line_w):
    L = lambda cls, body: f'<svg class="il {cls}" viewBox="0 0 240 240" aria-hidden="true">{body}</svg>'
    pc = lambda x, y: f'{x / 2.4:.2f}% {y / 2.4:.2f}%'
    layers = ''.join([
        L('i-sky', f'{DEFS}<g clip-path="url(#ttDisk)"><circle cx="{C}" cy="{C}" r="{R_IN}" fill="{PAPER}"/>{SKY}{FAR}</g>'),
        L('i-sun', f'<g clip-path="url(#ttDisk)">{SUN}</g>'),
        L('i-sea', f'<g clip-path="url(#ttDisk)">{SEA}{GLINT}</g>'),
        f'<div class="il i-wavewrap"><svg class="i-waves" viewBox="0 0 480 240" aria-hidden="true">{waves(0, 480)}</svg></div>',
        L('i-isle', f'<g clip-path="url(#ttDisk)">{ISLE}{tufts()}</g>'),
        L('i-gulls', GULLS),
        f'<div class="il i-bob">{L("i-tug", f"<g transform=\"{TUG_T}\">{TOWLINE}{TUG}</g>")}</div>',
        ''.join(L(f'i-puff i-p{i}', puff(FUNNEL_TOP[0], FUNNEL_TOP[1], 6.5)) for i in range(4)),
        L('i-steam i-s1', steam(*WHISTLE_AT)), L('i-steam i-s2', steam(*WHISTLE_AT)),
    ])
    return f"""<!-- The opening (made by tools/logo.py): the logo builds up while the game loads; a tap brings the tug in, with music -->
<div id="intro" role="dialog" aria-label="Tugboat Tycoon">
  <div class="i-badge"><div class="i-disk">{layers}</div>{L('i-ring', rope())}</div>
  <svg class="i-name" viewBox="0 -36 {name_w:.0f} 46" aria-hidden="true"><path d="{name_d}"/></svg>
  <div class="i-rule"></div>
  <svg class="i-line" viewBox="0 -10 {line_w:.0f} 13" aria-hidden="true"><path d="{line_d}"/></svg>
  <div class="i-go"><span class="i-wait">Loading</span><button class="i-btn" type="button">Tap to begin</button></div>
</div>
<script>window.__introAt = performance.now(); if (!matchMedia('(hover: none)').matches) document.querySelector('#intro .i-btn').textContent = 'Click to begin';</script>
<style>
  #intro {{ position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
    background: var(--surface, {PAPER}); color: var(--ink, {INK}); z-index: 1000; transition: opacity .45s ease, transform .45s ease; -webkit-user-select: none; user-select: none; }}
  #intro.ready, #intro.go {{ cursor: pointer; }}
  #intro.out {{ opacity: 0; transform: scale(1.03); pointer-events: none; }}
  #intro .i-badge {{ width: min(62vw, 42vh, 380px); aspect-ratio: 1; position: relative; animation: iBadge .9s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-disk, #intro .il {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
  #intro .i-disk {{ clip-path: circle({R_IN / 2.4:.3f}% at 50% 50%); }}
  #intro .il, #intro .i-name, #intro .i-rule, #intro .i-line, #intro .i-go {{ will-change: transform, opacity; }}
  /* the build-up, while the game loads */
  #intro .i-sky {{ animation: iFade .5s .15s both; }}
  #intro .i-sun {{ animation: iSun 1.2s .2s cubic-bezier(.2,.7,.3,1) both; }}
  #intro .i-sea {{ animation: iFade .4s .25s both; }}
  #intro .i-wavewrap {{ animation: iFade .5s .35s both; }}
  #intro .i-waves {{ position: absolute; top: 0; left: 0; width: 200%; height: 100%; animation: iWaves 6s linear infinite; }}
  #intro .i-isle {{ animation: iRise .8s .35s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-gulls {{ animation: iFade .6s .5s both, iGlide 5s .5s ease-in-out infinite alternate; }}
  #intro .i-ring {{ animation: iRing 1s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-name {{ width: min(76vw, 500px); height: auto; margin-top: 3vh; fill: currentColor; animation: iWord .8s .9s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-rule {{ width: min(30vw, 170px); height: 1px; background: var(--rule, {GOLD}); margin: 1.3vh 0 1.1vh; transform-origin: 50% 50%; animation: iRuleIn .6s 1.25s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-line {{ width: min(52vw, 290px); height: auto; fill: var(--ink-2, #56616b); animation: iFade .6s 1.4s both; }}
  #intro .i-go {{ height: 64px; margin-top: 3.4vh; display: grid; place-items: center; transition: opacity .3s ease; }}
  #intro .i-wait {{ font: 500 13px/1 "Alegreya Sans", system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-2, #56616b); animation: iFade .5s 1.8s both, iPulse 1.6s 2.3s ease-in-out infinite; }}
  #intro .i-btn {{ display: none; font: 700 18px/1 "Alegreya Sans", system-ui, sans-serif; padding: 15px 32px; border: 0; border-radius: 999px; background: var(--magenta, {MAGENTA}); color: var(--on-magenta, #fff); cursor: pointer; box-shadow: 0 2px 0 rgba(0,0,0,.18), 0 6px 18px rgba(0,0,0,.12); animation: iRise .45s cubic-bezier(.2,.8,.2,1) both; }}
  #intro .i-btn:focus-visible {{ outline: 3px solid var(--ink, {INK}); outline-offset: 3px; }}
  #intro.ready .i-wait {{ display: none; }} #intro.ready .i-btn {{ display: inline-block; }}
  #intro.go .i-go {{ opacity: 0; pointer-events: none; }}
  /* the tap: the tug sails in, steams, and blows her whistle with the music; one moving animation to an element, so each
     runs off the main thread (sailing in on the tug, bobbing on its wrapper) */
  #intro .i-tug {{ transform: translateX(-62%); }}
  #intro .i-puff, #intro .i-steam {{ opacity: 0; }}
  #intro.go .i-tug {{ animation: iTugIn {TUG_IN}s cubic-bezier(.15,.75,.25,1) both; }}
  #intro.go .i-bob {{ animation: iBob 2.4s {TUG_IN}s ease-in-out infinite; transform-origin: 38% 64%; }}
  #intro.go .i-puff {{ transform-origin: {pc(*FUNNEL_TOP)}; animation: iPuff 1.8s ease-out infinite; }}
  #intro.go .i-p0 {{ animation-delay: .5s; }} #intro.go .i-p1 {{ animation-delay: .95s; }} #intro.go .i-p2 {{ animation-delay: 1.4s; }} #intro.go .i-p3 {{ animation-delay: 1.85s; }}
  #intro.go .i-steam {{ transform-origin: {pc(*WHISTLE_AT)}; }}
  #intro.go .i-s1 {{ animation: iSteam {TOOT1_LEN + .35:.2f}s {TOOT1:.2f}s ease-out both; }}
  #intro.go .i-s2 {{ animation: iSteam {TOOT2_LEN + .4:.2f}s {TOOT2:.2f}s ease-out both; }}
  @keyframes iBadge {{ from {{ transform: scale(.86); }} to {{ transform: none; }} }}
  @keyframes iFade {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
  @keyframes iPulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: .35; }} }}
  @keyframes iSun {{ from {{ opacity: 0; transform: translateY(9%); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes iRise {{ from {{ opacity: 0; transform: translateY(5%); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes iWaves {{ from {{ transform: translateX(0); }} to {{ transform: translateX(-50%); }} }}
  @keyframes iTugIn {{ from {{ transform: translateX(-62%); }} to {{ transform: none; }} }}
  @keyframes iBob {{ 0%, 100% {{ transform: translateY(0) rotate(0); }} 50% {{ transform: translateY(.7%) rotate(-.8deg); }} }}
  @keyframes iPuff {{ 0% {{ opacity: 0; transform: translate(0, 0) scale(.35); }} 15% {{ opacity: .95; }} 100% {{ opacity: 0; transform: translate(-17%, -14%) scale(2.1); }} }}
  @keyframes iSteam {{ 0% {{ opacity: 0; transform: translate(0, 0) scale(.4); }} 12% {{ opacity: 1; }} 70% {{ opacity: .85; }} 100% {{ opacity: 0; transform: translate(-3%, -7%) scale(1.5); }} }}
  @keyframes iGlide {{ from {{ transform: translate(0, 0); }} to {{ transform: translate(5%, -1.5%); }} }}
  @keyframes iRing {{ from {{ opacity: 0; transform: rotate(-70deg) scale(.8); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes iWord {{ from {{ opacity: 0; transform: translateY(18%) scale(.96); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes iRuleIn {{ from {{ transform: scaleX(0); }} to {{ transform: none; }} }}
  @media (prefers-reduced-motion: reduce) {{ #intro *, #intro {{ animation: none !important; }} #intro .i-tug {{ transform: none; }} #intro .i-puff, #intro .i-steam {{ opacity: 0; }} }}
</style>
"""


if __name__ == '__main__':
    main()
