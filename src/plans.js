// Plan sheets of the boats and lake ships: an outboard profile, a deck plan and a midship section, drawn from each
// boat's dimensions in the style of a shipyard's general arrangement. The proportions follow her length, beam and draft;
// the houses, doors and fittings are typical of her type and era, not copied from one boat's plans.
// build.py inlines this file into the game; tools/plansheet.js uses it to draw the sheets as pictures.
const PLAN = (() => {
  const C = { paper: '#f4ecd9', ink: '#22303a', ink2: '#5b6670', hid: '#6f7c86', wash: '#cfe0e8', tint: '#e6dcc4', glass: '#dfe6e8', lamp: '#f6e7a8',
    brass: '#c9a24a', smoke: '#3a3f44', band: '#a33b5f', sail: '#fbf6ea', rope: '#6b5640', lumber: '#dcc08a', wl: '#3d6f8f', boat: '#f7f1e3' };
  const ftIn = x => { const f = Math.floor(x + 1e-6), i = Math.round((x - f) * 12); return i === 12 ? `${f + 1} ft` : i ? `${f} ft ${i} in` : `${f} ft`; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  let seq = 0;

  // The kinds of boat. fb: freeboard at the stern, the lowest point and the bow, as a share of her draft.
  // hull: how the keel, stem and stern run. full: where a ship's parallel middle body begins and ends.
  const KINDS = {
    tug: { hull: 'tug', drag: .28, fb: [.34, .3, .74], prop: true },
    wrecker: { hull: 'tug', drag: .22, fb: [.34, .3, .72], prop: true },
    diesel: { hull: 'tug', drag: .22, fb: [.32, .28, .66], prop: true },
    fishOpen: { hull: 'tug', drag: .2, fb: [.36, .32, .62], prop: true },
    fishEnclosed: { hull: 'tug', drag: .18, fb: [.35, .32, .65], prop: true },
    skiff: { hull: 'skiff', drag: 0, fb: [1.45, 1.15, 1.6] },
    schooner: { hull: 'schooner', drag: .12, fb: [.5, .38, .72], full: [.3, .62] },
    steambarge: { hull: 'ship', drag: 0, fb: [.48, .36, .62], full: [.22, .76], prop: true },
    laker: { hull: 'ship', drag: 0, fb: [.42, .38, .58], full: [.12, .88], prop: true },
    passenger: { hull: 'ship', drag: 0, fb: [.62, .55, .78], full: [.26, .7], prop: true },
  };

  function sheet(d, opt = {}) {
    const K = KINDS[d.kind], o = d.o || {}, fam = K.hull, L = d.L, B = d.B, T = d.T, id = 'ps' + (opt.key || ++seq);
    const thumb = !!opt.thumb;
    // ---- the hull, in feet: x from the stern, y up from the keel at the stern, z out from the centreline ----
    const drag = T * K.drag, xr = fam === 'skiff' ? L * .06 : fam === 'ship' ? L * .035 : fam === 'schooner' ? L * .07 : L * .075;
    const xp = xr + (K.prop ? Math.max(2.2, T * .38) : 0), xl = L * (fam === 'ship' ? .5 : .38);
    const [Ds, Dm, Db] = K.fb.map(f => T + f * T);
    const D = x => x < xl ? Dm + (Ds - Dm) * ((xl - x) / xl) ** 2 : Dm + (Db - Dm) * ((x - xl) / (L - xl)) ** (fam === 'ship' ? 2.4 : 1.7);
    const yk = fam === 'skiff' ? (x => .9 * T * ((2 * x / L - 1) ** 6)) : fam === 'ship' ? (() => 0)
      : (x => x <= xp ? 0 : x >= L * .86 ? drag : drag * (x - xp) / (L * .86 - xp));
    const rS = L * (fam === 'ship' ? .035 : .09);
    const hb = x => {
      if (fam === 'skiff') { const t = x / L; return B / 2 * Math.pow(Math.max(0, 1 - Math.abs(2 * t - 1.04) ** 2.3), .72); }
      let body;
      if (K.full) { const [a, f] = K.full.map(v => v * L);
        body = x >= f ? B / 2 * Math.pow(Math.max(0, 1 - ((x - f) / (L - f)) ** (fam === 'ship' ? 2 : 2.1)), fam === 'ship' ? .62 : .8)
          : x >= a ? B / 2 : B / 2 * Math.sqrt(Math.max(0, 1 - ((a - x) / (a + L * .05)) ** 2.4));
      } else { const xm = L * .45; body = x >= xm ? B / 2 * Math.pow(Math.max(0, 1 - ((x - xm) / (L - xm)) ** 2.2), .85) : B / 2 * Math.sqrt(1 - ((xm - x) / (xm + L * .15)) ** 2); }
      return x < rS ? body * Math.sqrt(Math.max(0, 1 - ((rS - x) / rS) ** 2)) : body;
    };
    const g = { L, B, T, D, yk, hb, xr, xp, Ds, Dm, Db, o, fam, d };
    const dress = DRESS[d.kind];
    const top = Math.max(dress.top(g), Db + 6), ext = dress.ext ? dress.ext(g) : [3, 3];
    // ---- the scale and the layout of the sheet ----
    const s = Math.min(960 / (L + ext[0] + ext[1]), (fam === 'schooner' || fam === 'skiff' ? 560 : 440) / top, 300 / B);
    const W = 1600, X0 = 125 + ext[0] * s, Yb = 120 + top * s + 10, Yp = Yb + 95 + B / 2 * s;
    const px = x => X0 + x * s, py = y => Yb - y * s, pz = z => Yp + z * s;
    const f1 = v => v.toFixed(1);
    const P = pts => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(px(x))},${f1(py(y))}`).join('');
    const Pp = pts => pts.map(([x, z], i) => `${i ? 'L' : 'M'}${f1(px(x))},${f1(pz(z))}`).join('');
    const out = [], hid = [], labA = [], labB = [];
    const line = (p, w = 1, c = C.ink, extra = '') => out.push(`<path d="${p}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`);
    const area = (p, fill, w = 1.2, c = C.ink) => out.push(`<path d="${p}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`);
    const dash = (p, w = 1) => hid.push(`<path d="${p}" fill="none" stroke="${C.hid}" stroke-width="${w}" stroke-dasharray="5 3.5" stroke-linejoin="round"/>`);
    const hidC = (x, y, r) => hid.push(`<circle cx="${f1(px(x))}" cy="${f1(py(y))}" r="${f1(r * s)}" fill="none" stroke="${C.hid}" stroke-dasharray="4 3"/>`);
    const rect = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) + 'Z';
    const rectP = (x0, z0, x1, z1) => Pp([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) + 'Z';
    const circ = (x, y, r, fill, w = 1) => out.push(`<circle cx="${f1(px(x))}" cy="${f1(py(y))}" r="${f1(Math.max(1, r * s))}" fill="${fill}" stroke="${C.ink}" stroke-width="${w}"/>`);
    const circP = (x, z, r, fill, w = 1) => out.push(`<circle cx="${f1(px(x))}" cy="${f1(pz(z))}" r="${f1(Math.max(1, r * s))}" fill="${fill}" stroke="${C.ink}" stroke-width="${w}"/>`);
    const lab = (row, text, ax, ay, it) => (row === 'A' ? labA : labB).push({ text, ax, ay, it });
    const k = Object.assign(g, { s, px, py, pz, P, Pp, line, area, dash, hidC, rect, rectP, circ, circP, lab, range, C, id, ftIn });

    // ---- outboard profile: the hull ----
    let hull;
    const sheer = range(0, L, 140).map(x => [x, D(x)]);
    if (fam === 'tug') {
      hull = P([[0, Ds - .085 * T], ...sheer, [L, Db], [L - .012 * L, T * .5]]) + `Q${f1(px(L * .97))},${f1(py(drag + .2))} ${f1(px(L * .86))},${f1(py(drag))}`
        + P([[xp, 0], [xr - .35, 0], [xr - .35, .07 * T], [xr, .1 * T], [xr, T * 1.05]]).replace('M', 'L')
        + `Q${f1(px(xr * .45))},${f1(py(T * 1.08))} ${f1(px(0))},${f1(py(Ds - .085 * T))}Z`;
    } else if (fam === 'ship') {
      hull = P([[0, Ds - .1 * T], ...sheer, [L, Db], [L - .006 * L, T * .3]]) + `Q${f1(px(L - .008 * L))},${f1(py(0))} ${f1(px(L - .04 * L))},${f1(py(0))}`
        + P([[xp, 0], [xr - .2, 0], [xr - .2, .06 * T], [xr, .08 * T], [xr, T * 1.02]]).replace('M', 'L')
        + `Q${f1(px(xr * .3))},${f1(py(T * 1.04))} ${f1(px(0))},${f1(py(Ds - .1 * T))}Z`;
    } else if (fam === 'schooner') {
      hull = P([[0, Ds - .12 * T], ...sheer, [L, Db]]) + `Q${f1(px(L - .005 * L))},${f1(py(T * .55))} ${f1(px(L - .045 * L))},${f1(py(T * .2))}`
        + `Q${f1(px(L - .08 * L))},${f1(py(drag))} ${f1(px(L * .86))},${f1(py(drag))}` + P([[xr + .012 * L, 0], [xr, T * .98]]).replace('M', 'L')
        + `Q${f1(px(xr * .35))},${f1(py(T * 1.02))} ${f1(px(0))},${f1(py(Ds - .12 * T))}Z`;
    } else {
      const ky = range(L * .06, L * .94, 60).map(x => [x, yk(x)]);
      hull = P([[L * .015, Ds], ...sheer.filter(([x]) => x > L * .015 && x < L * .985), [L * .985, Db]]) + `Q${f1(px(L * 1.0))},${f1(py(T * .7))} ${f1(px(L * .94))},${f1(py(yk(L * .94)))}`
        + P(ky.slice().reverse()).replace('M', 'L') + `Q${f1(px(L * -.005))},${f1(py(T * .7))} ${f1(px(L * .015))},${f1(py(Ds))}Z`;
    }
    out.push(`<clipPath id="${id}h"><path d="${hull}"/></clipPath>`);
    area(hull, C.paper, 1.8);
    if (!o.open || fam !== 'skiff') out.push(`<rect x="${px(-3)}" y="${py(T)}" width="${(L + 6) * s}" height="${T * s + 4}" fill="${C.wash}" opacity=".75" clip-path="url(#${id}h)"/>`);
    if (o.steel || fam === 'ship') for (let off = Math.max(2, T * .22); off < Db; off += Math.max(2, T * .22)) out.push(`<path d="${P(range(0, L, 80).map(x => [x, D(x) - off]))}" fill="none" stroke="${C.ink2}" stroke-width=".45" clip-path="url(#${id}h)"/>`);
    if (fam === 'skiff') for (let k2 = 1; k2 < 6; k2++) out.push(`<path d="${P(range(0, L, 60).map(x => [x, yk(x) + (D(x) - yk(x)) * k2 / 6]))}" fill="none" stroke="${C.ink2}" stroke-width=".6" clip-path="url(#${id}h)"/>`);
    area(hull, 'none', 1.8);
    // propeller and rudder
    let pc = null;
    if (K.prop) {
      out.push(`<rect x="${f1(px(xr + .25))}" y="${f1(py(T * .8))}" width="${f1((xp - xr - .4) * s)}" height="${f1((T * .8 - .07 * T) * s)}" rx="${f1(.1 * T * s)}" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>`);
      const pr = Math.min(T * .36, (xp - xr) * .9); pc = [(xr + xp) / 2 + .05, T * .42];
      area(`M${f1(px(pc[0]))},${f1(py(pc[1] + pr))}Q${f1(px(pc[0] + .08 * T))},${f1(py(pc[1]))} ${f1(px(pc[0]))},${f1(py(pc[1] - pr))}Q${f1(px(pc[0] - .08 * T))},${f1(py(pc[1]))} ${f1(px(pc[0]))},${f1(py(pc[1] + pr))}Z`, C.tint, 1.1);
      circ(pc[0], pc[1], .04 * T, C.ink);
      const rw = Math.max(1.6, T * .36);
      area(P([[xr, .07 * T], [xr - rw * .92, .1 * T], [xr - rw, T * .55], [xr - rw * .88, T * .92], [xr, T * .95]]) + 'Z', C.tint, 1.2);
      lab('B', 'Rudder', xr - rw * .5, T * .4); lab('B', 'Propeller', pc[0], pc[1] - pr * .6);
      k.pc = pc;
    } else if (fam === 'schooner') {
      const rw = T * .3; area(P([[xr + .01 * L, .05 * T], [xr - rw, .1 * T], [xr - rw, T * .8], [xr - .2, T * .95]]) + 'Z', C.tint, 1.2); lab('B', 'Rudder', xr - rw / 2, T * .4);
    }
    // waterline
    line(P([[-ext[0] + .5, T], [L + ext[1] - .5, T]]), .9, C.wl, 'stroke-dasharray="10 4 2 4"');
    if (!thumb) out.push(`<text x="${f1(px(L + ext[1]) + 4)}" y="${f1(py(T) + 4)}" class="ps-t ps-s">Load waterline</text>`);
    // the guard or rubbing strake along the sheer
    if (fam === 'tug') area(P([...range(.5, L - .6, 80).map(x => [x, D(x) - .04 * T]), ...range(L - .6, .5, 80).map(x => [x, D(x) - .135 * T])]) + 'Z', C.tint, 1);
    if (fam === 'ship' || fam === 'schooner') line(P(range(L * .01, L * .995, 80).map(x => [x, D(x) - .05 * T])), 1, C.ink2);
    // ---- the deck plan: the hull outline, the guards and the centreline ----
    const xsP = range(0, L, 160);
    area(Pp([...xsP.map(x => [x, -hb(x)]), ...xsP.slice().reverse().map(x => [x, hb(x)])]) + 'Z', C.paper, 1.8);
    if (fam === 'tug') for (const sg of [-1, 1]) line(Pp(range(rS * .45, L * .985, 120).map(x => [x, sg * (hb(x) + .065 * T)])), 1.1);
    if (fam !== 'skiff') line(Pp([[-ext[0] + .5, 0], [L + ext[1] - .5, 0]]), .7, C.ink2, 'stroke-dasharray="14 4 2 4"');

    // ---- houses, stacks, masts, fittings, and what lies inside ----
    dress.draw(k);

    // ---- overall length, draft, the view names ----
    const dy = B / 2 + Math.max(3.2, B * .2);
    if (!thumb) {
      line(Pp([[0, dy], [L, dy]]), .9); for (const x of [0, L]) line(Pp([[x, dy - .9 * B / 15], [x, dy + .9 * B / 15]]), .9);
      out.push(`<text x="${f1(px(L / 2))}" y="${f1(pz(dy) - 6)}" class="ps-t ps-c">${ftIn(L)} overall</text>`);
      out.push(`<text x="${f1(px(-ext[0]))}" y="${f1(pz(-B / 2) - 8 - (dress.planUp || 0) * s)}" class="ps-h">${dress.planName || 'Deck plan'}</text>`);
      out.push(`<text x="${f1(px(-ext[0]))}" y="${f1(py(top) - 64)}" class="ps-h">${dress.profileName || 'Outboard profile, starboard side'}</text>`);
      const dx = -ext[0] + .3; line(P([[dx, 0], [dx, T]]), .9); for (const y of [0, T]) line(P([[dx - .03 * L, y], [dx + .03 * L, y]]), .9);
      out.push(`<text x="${f1(px(dx) - 6)}" y="${f1(py(T / 2) + 4)}" class="ps-t ps-r">${ftIn(T)}</text>`);
    }

    // ---- midship section, at a larger scale when the boat is big ----
    let secBottom = Yb;
    if (!thumb) {
      const xc = L * .45, b = B / 2, dk = D(xc) - yk(xc), wl = T - yk(xc), hh = dress.secH ? dress.secH(k) : 0;
      const ss = Math.min(300 / (B + 3), (Yb - 160) / (dk + hh + 3), s * 3), cx = 1320, sy = y => Yb - y * ss, sx = z => cx + z * ss, Q = (z, y) => `${f1(sx(z))},${f1(sy(y))}`;
      let sec;
      if (fam === 'tug') sec = `M${Q(-.06 * T, -.08 * T)}L${Q(.06 * T, -.08 * T)}L${Q(.06 * T, 0)}L${Q(b * .45, .06 * T)}Q${Q(b - .1, .1 * T)} ${Q(b - .1, .45 * T)}L${Q(b, dk)}Q${Q(0, dk + .08 * T)} ${Q(-b, dk)}L${Q(-b + .1, .45 * T)}Q${Q(-b + .1, .1 * T)} ${Q(-b * .45, .06 * T)}L${Q(-.06 * T, 0)}Z`;
      else if (fam === 'ship') { const r = B * (o.wood ? .2 : .1); sec = `M${Q(-b, dk)}L${Q(-b, r)}Q${Q(-b, 0)} ${Q(-b + r, 0)}L${Q(b - r, 0)}Q${Q(b, 0)} ${Q(b, r)}L${Q(b, dk)}Q${Q(0, dk + B * .02)} ${Q(-b, dk)}Z`; }
      else if (fam === 'schooner') { const r = B * .22; sec = `M${Q(-.5, -.6)}L${Q(.5, -.6)}L${Q(.5, 0)}L${Q(b - r, .15)}Q${Q(b, .3)} ${Q(b, r)}L${Q(b, dk)}Q${Q(0, dk + B * .025)} ${Q(-b, dk)}L${Q(-b, r)}Q${Q(-b, .3)} ${Q(-b + r, .15)}L${Q(-.5, 0)}Z`; }
      else { // lapstrake: six planks a side, each lapped outside the one below
        const pts = [[.25, 0]]; for (let i = 1; i <= 6; i++) { const t = i / 6, z = b * (.22 + .78 * Math.pow(t, .55)), zp = b * (.22 + .78 * Math.pow((i - 1) / 6, .55)); pts.push([zp + (z - zp) * .85, dk * t - dk * .02], [z, dk * t]); }
        sec = `M${Q(-.25, -.3)}L${Q(.25, -.3)}` + pts.map(([z, y]) => `L${Q(z, y)}`).join('') + pts.slice().reverse().map(([z, y]) => `L${Q(-z, y)}`).join('') + `L${Q(-.25, -.3)}Z`; }
      out.push(`<clipPath id="${id}s"><path d="${sec}"/></clipPath>`);
      area(sec, C.paper, 1.8);
      out.push(`<rect x="${f1(sx(-b - 1))}" y="${f1(sy(wl))}" width="${f1((B + 2) * ss)}" height="${f1(wl * ss + 30)}" fill="${C.wash}" opacity=".75" clip-path="url(#${id}s)"/>`);
      area(sec, 'none', 1.8);
      line(`M${Q(-b - B * .12, wl)}L${Q(b + B * .12, wl)}`, .9, C.wl, 'stroke-dasharray="10 4 2 4"');
      if (dress.sec) dress.sec(k, { sx, sy, Q, b, dk, wl, ss });
      const by = dk + hh + Math.max(2.4, B * .15);
      line(`M${Q(-b, by)}L${Q(b, by)}`, .9); for (const z of [-b, b]) line(`M${Q(z, by - B * .05)}L${Q(z, by + B * .05)}`, .9);
      out.push(`<text x="${cx}" y="${f1(sy(by) - 6)}" class="ps-t ps-c">${ftIn(B)} beam</text>`);
      secBottom = sy(-.08 * T) + 26;
      out.push(`<text x="${cx}" y="${f1(secBottom)}" class="ps-h ps-c">Midship section${ss > s * 1.05 ? `, ×${Math.round(ss / s * 10) / 10} scale` : ''}</text>`);
    }

    // ---- labels, in a row above the profile and a row below it, pushed apart so they never overlap ----
    if (!thumb) {
      const place = (labs, y, up) => {
        labs.sort((a, b) => a.ax - b.ax); let end = 60;
        for (const l of labs) { l.w = l.text.length * (l.it ? 6.5 : 6.9) + 6; l.x = Math.max(px(l.ax) - l.w / 2, end + 12); end = l.x + l.w; }
        let lim = 1190; for (const l of labs.slice().reverse()) { if (l.x + l.w > lim) l.x = lim - l.w; lim = l.x - 12; }
        for (const l of labs) {
          const tx = l.x + l.w / 2, ax = px(l.ax), ay = py(l.ay);
          out.push(`<path d="M${f1(ax)},${f1(ay)}L${f1(tx)},${f1(y + (up ? 6 : -16))}" stroke="${C.ink2}" stroke-width=".7" fill="none"/><circle cx="${f1(ax)}" cy="${f1(ay)}" r="1.8" fill="${C.ink2}"/>`);
          out.push(`<text x="${f1(tx)}" y="${f1(y)}" class="ps-t ps-c${l.it ? ' ps-i' : ''}">${esc(l.text)}</text>`);
        }
      };
      place(labA, py(top) - 28, true); place(labB, Yb + 44, false);
    }

    const css = `.ps-t{font-family:'Alegreya Sans',sans-serif;font-size:13.5px;fill:${C.ink}}.ps-c{text-anchor:middle}.ps-r{text-anchor:end}.ps-i{font-style:italic;fill:${C.ink2}}.ps-s{font-size:11.5px}
      .ps-h{font-family:'IM Fell English SC',serif;font-size:19px;fill:${C.ink}}.ps-sc{font-family:'IM Fell English SC',serif;font-size:15px;letter-spacing:.04em}
      .ps-ttl{font-family:'IM Fell English SC',serif;font-size:30px;fill:${C.ink}}.ps-k{fill:${C.ink2}}.ps-v{font-weight:700}`;
    if (thumb) {
      const x0 = px(-ext[0]) - 6, y0 = py(top) - 6, w = px(L + ext[1]) + 6 - x0, h = py(fam === 'skiff' ? -.3 * T : -.1 * T) + 8 - y0;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}" class="plansvg" role="img" aria-label="${esc(d.title)}: side view"><style>${css}</style><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}" fill="${C.paper}"/>${out.join('')}</svg>`;
    }

    // ---- the title block ----
    const wrap = (v, n = 42) => { const ls = ['']; for (const x of String(v).split(' ')) { if ((ls[ls.length - 1] + ' ' + x).trim().length > n) ls.push(x); else ls[ls.length - 1] = (ls[ls.length - 1] + ' ' + x).trim(); } return ls; };
    const sub = wrap(d.sub, 58); if (sub.length > 2) { sub.length = 2; sub[1] = sub[1].replace(/[,;]?\s*\S*$/, '…'); }
    const rowsH = d.rows.filter(r => r[1]).reduce((a, r) => a + 23 + (wrap(r[1]).length - 1) * 18, 0), tbH = Math.max(380, 128 + (sub.length > 1 ? 14 : 0) + rowsH + 64);
    const H = Math.max(1000, Yp + B / 2 * s + Math.max(3.2, B * .2) * s + 70, secBottom + 40 + tbH);
    const tb = [1100, Math.max(H - 30 - tbH, secBottom + 26), 1560, H - 30];
    let ty = tb[1] + 128; const tbl = d.rows.filter(r => r[1]).map(([kk, v]) => { const ls = wrap(v), t = `<text x="${tb[0] + 18}" y="${ty}" class="ps-t ps-k">${esc(kk)}</text>` + ls.map((l, j) => `<text x="${tb[0] + 140}" y="${ty + j * 18}" class="ps-t ps-v">${esc(l)}</text>`).join(''); ty += 23 + (ls.length - 1) * 18; return t; }).join('');
    const F = [5, 10, 20, 25, 50, 100, 200].find(f => f * s >= 110) || 200, fw = F * s;
    const scale = `<g transform="translate(${tb[0] + 18},${tb[3] - 32})">${[0, 1, 2, 3].map(i => `<rect x="${f1(i * fw / 4)}" y="0" width="${f1(fw / 4)}" height="7" fill="${i % 2 ? C.paper : C.ink}" stroke="${C.ink}" stroke-width=".8"/>`).join('')}
      ${[0, 1, 2].map(i => `<text x="${f1(i * fw / 2)}" y="22" class="ps-t ps-c ps-s">${i * F / 2}</text>`).join('')}<text x="${f1(fw + 10)}" y="8" class="ps-t ps-s">feet</text></g>`;
    const tsz = Math.min(30, 420 / (d.title.length * .58));
    const block = `<rect x="${tb[0]}" y="${tb[1]}" width="${tb[2] - tb[0]}" height="${tb[3] - tb[1]}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>
      <line x1="${tb[0]}" y1="${tb[1] + 34}" x2="${tb[2]}" y2="${tb[1] + 34}" stroke="${C.ink}"/><line x1="${tb[0]}" y1="${tb[3] - 50}" x2="${tb[2]}" y2="${tb[3] - 50}" stroke="${C.ink}"/>
      <text x="${tb[0] + 18}" y="${tb[1] + 23}" class="ps-t ps-sc">Tugboat Tycoon · Georgian Bay</text><text x="${tb[2] - 18}" y="${tb[1] + 23}" class="ps-t ps-r ps-sc">${esc(d.corner || '')}</text>
      <text x="${tb[0] + 18}" y="${tb[1] + 72}" class="ps-ttl" style="font-size:${tsz.toFixed(1)}px">${esc(d.title)}</text>
      ${sub.slice(0, 2).map((l, j) => `<text x="${tb[0] + 18}" y="${tb[1] + 96 + j * 16}" class="ps-t ps-i">${esc(l)}</text>`).join('')}
      ${tbl.replace(/y="(\d+(?:\.\d+)?)"/g, (m0, v) => `y="${+v + (sub.length > 1 ? 14 : 0)}"`)}${scale}
      <text x="${tb[2] - 18}" y="${tb[3] - 24}" class="ps-t ps-r ps-s ps-i">Drawn from her dimensions.</text><text x="${tb[2] - 18}" y="${tb[3] - 10}" class="ps-t ps-r ps-s ps-i">Details are typical of the type.</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${f1(H)}" class="plansvg" role="img" aria-label="Plans of the ${esc(d.title)}"><style>${css}</style>
      <rect width="${W}" height="${f1(H)}" fill="${C.paper}"/><rect x="18" y="18" width="${W - 36}" height="${f1(H - 36)}" fill="none" stroke="${C.ink}" stroke-width="2"/><rect x="24" y="24" width="${W - 48}" height="${f1(H - 48)}" fill="none" stroke="${C.ink}" stroke-width=".7"/>
      ${out.join('\n')}${hid.join('\n')}${block}</svg>`;
  }

  // ===== the furniture of each kind of boat =====
  // A deckhouse with windows and doors, on the deck from x0 to x1 (shares of her length), roof h feet above the deck at its middle
  function house(k, x0, x1, h, o = {}) {
    const { L, D, P, area, range, rect, C } = k, a = L * x0, b = L * x1, roof = (o.base != null ? o.base : D((a + b) / 2)) + h;
    const base = x => o.base != null ? o.base : D(x);
    area(P([[a, base(a)], ...range(a, b, 20).map(x => [x, base(x)]), [b, roof], [a, roof]]) + 'Z', o.fill || C.paper, 1.4);
    area(rect(a - .4, roof, b + .2, roof + .35), C.ink, .8);
    if (o.windows !== false) { const sp = o.spacing || 3.4; for (let x = a + 2.6; x < b - 1.5; x += sp) { const y0 = base(x) + Math.min(3.1, h * .48); area(rect(x - .6, y0, x + .6, y0 + 1.3), C.glass, .9); } }
    if (o.doors !== false) for (const f of o.doors || [.06]) { const x = a + (b - a) * f; area(rect(x - 1, base(x) + .1, x + 1, base(x) + Math.min(5.2, h - .6)), 'none', .9); }
    return roof;
  }
  function pilotHouse(k, x0, x1, base, h, o = {}) {
    const { L, rect, area, C } = k, a = L * x0, b = L * x1, top = base + h;
    area(rect(a, base, b, top), C.paper, 1.4); area(rect(a - .5, top, b + .5, top + .4), C.ink, .8);
    const n = o.windows || 3, w = (b - a - 1.2) / n;
    for (let i = 0; i < n; i++) area(rect(a + .6 + i * w, top - Math.min(2.9, h * .45), a + .6 + (i + 1) * w - .5, top - .7), C.glass, .9);
    return top;
  }
  function stack(k, x, d, base, top, o = {}) {
    const { L, P, rect, area, line, C } = k, rake = (o.rake ?? .06) * (top - base), xa = L * x - d / 2, xb = L * x + d / 2;
    area(P([[xa, base], [xa - rake, top], [xb - rake, top], [xb, base]]) + 'Z', C.smoke, 1.2);
    area(rect(xa - rake - .1 * d, top, xb - rake + .1 * d, top + .18 * d), C.ink, .8);
    if (o.band) area(P([[xa - rake * .85, top - 1.05 * d], [xb - rake * .85, top - 1.05 * d], [xb - rake * .88, top - .7 * d], [xa - rake * .88, top - .7 * d]]) + 'Z', C.band, .6);
    if (o.whistle) { const wx = xb - rake * .7 + .28 * d, wy = top - 1.7 * d; line(P([[xb - rake * .7, wy - .2 * d], [wx, wy - .2 * d], [wx, wy]]), 1.3); area(rect(wx - .1 * d, wy, wx + .1 * d, wy + .5 * d), C.brass, .8); k.lab('A', 'Whistle', wx, wy + .3 * d); }
    if (o.pipe) line(P([[xb + .2 * d, base], [xb + .2 * d - rake * 1.02, top + .55 * d]]), 1.2);
    return { x: L * x - rake, top };
  }
  function lights(k, x, base, h, n = 2) {
    const { P, rect, area, line, C } = k; line(P([[x, base], [x, base + h]]), 1.6);
    for (let i = 0; i < n; i++) { const y = base + h - .9 - i * 1.5; area(rect(x - .45, y - .55, x + .45, y + .55), C.lamp, .9); }
  }
  function yawl(k, a, len, base) {
    const { px, py, area, rect, C } = k, b = a + len, h = Math.max(1.4, len * .15);
    area(`M${px(a)},${py(base + .6)}Q${px((a + b) / 2)},${py(base)} ${px(b)},${py(base + 1)}L${px(b - .3)},${py(base + .6 + h)}Q${px((a + b) / 2)},${py(base + .1 + h)} ${px(a + .2)},${py(base + .6 + h * .85)}Z`, C.boat, 1.1);
    for (const x of [a + len * .15, b - len * .15]) area(rect(x - .3, base - .05, x + .3, base + .6), C.ink, .6);
  }
  function yawlPlan(k, a, len, w, z = 0) {
    const { px, pz, area, C } = k, b = a + len;
    area(`M${px(a)},${pz(z)}Q${px(a + len * .08)},${pz(z - w / 2)} ${px((a + b) / 2)},${pz(z - w / 2)}Q${px(b - len * .06)},${pz(z - w / 2 + .1)} ${px(b)},${pz(z)}Q${px(b - len * .06)},${pz(z + w / 2 - .1)} ${px((a + b) / 2)},${pz(z + w / 2)}Q${px(a + len * .08)},${pz(z + w / 2)} ${px(a)},${pz(z)}Z`, C.boat, 1);
  }
  function fillHull(k, x0, x1, inset, fill, w = 1.2) {
    const xs = k.range(k.L * x0, k.L * x1, 40).filter(x => k.hb(x) - inset > .3);
    if (xs.length > 1) k.area(k.Pp([...xs.map(x => [x, -(k.hb(x) - inset)]), ...xs.slice().reverse().map(x => [x, k.hb(x) - inset])]) + 'Z', fill, w);
  }
  function bollards(k, list) { for (const [x, sg] of list) for (const dd of [-.45, .45]) k.circP(x + dd * k.T / 7, sg * (k.hb(x) - .14 * k.T), .05 * k.T, k.C.ink, .5); }
  function hatchesP(k, x0, x1, n, w, l) { for (let i = 0; i < n; i++) { const x = k.L * x0 + (k.L * (x1 - x0)) * (i + .5) / n; k.area(k.rectP(x - l / 2, -w / 2, x + l / 2, w / 2), k.C.tint, 1); } }
  function anchor(k, ax, ay, sz = 1) {
    const { px, py, line } = k;
    line(`M${px(ax)},${py(ay + 1.1 * sz)}L${px(ax)},${py(ay - .9 * sz)}M${px(ax - sz)},${py(ay - .4 * sz)}Q${px(ax)},${py(ay - 1.4 * sz)} ${px(ax + sz)},${py(ay - .4 * sz)}M${px(ax - .7 * sz)},${py(ay + .6 * sz)}L${px(ax + .7 * sz)},${py(ay + .6 * sz)}`, 1.4);
  }
  function capsule(k, x0, y0, x1, y1) { const { px, py, hid, C } = k, r = (y1 - y0) / 2; k.dash(`M${px(x0 + r)},${py(y0)}L${px(x1 - r)},${py(y0)}A${r * k.s},${r * k.s} 0 0 0 ${px(x1 - r)},${py(y1)}L${px(x0 + r)},${py(y1)}A${r * k.s},${r * k.s} 0 0 0 ${px(x0 + r)},${py(y0)}Z`); }
  function shaft(k, x, y) { if (k.pc) k.dash(k.P([[x, y], [k.pc[0] + .5, k.pc[1]]]), 1.4); }
  // gaff sails, topsails and headsails on a schooner's masts; a sprit rig on the skiff
  function sail(k, pts, fill) { k.area(k.P(pts) + 'Z', fill || k.C.sail, 1); }

  const DRESS = {
    // ---------- steam tugs ----------
    tug: {
      top: g => g.D(g.L * .5) + (g.o.stackH || 18) * (g.L / 61) ** .55 + 1,
      ext: g => [Math.max(3, g.L * .06), Math.max(3, g.L * .05)],
      secH: k => 6.3 * Math.max(1, .75 + .25 * (k.L / 61) ** .55),
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk, o } = k, z = (L / 61) ** .55;
        // rail and forward bulwark
        const bw0 = L * .74;
        area(P([...range(bw0, L, 30).map(x => [x, D(x) + 1.3]), ...range(L, bw0, 30).map(x => [x, D(x)])]) + 'Z', C.paper, 1.1);
        line(P(range(L * .2, bw0, 40).map(x => [x, D(x) + 1.1])), 1); for (let x = L * .2; x < bw0; x += 2.2 * z) line(P([[x, D(x)], [x, D(x) + 1.1]]), .8);
        // deckhouse and pilot house: on the deck at the house's forward end on a small tug, on top of the house on a big one
        const hh = 6.3 * Math.max(1, .75 + .25 * z), h0 = o.onHouse ? .2 : .24, h1 = o.onHouse ? .74 : .70, roof = house(k, h0, h1, hh, { doors: [.05, .5] });
        let ptop, pmid;
        if (o.onHouse) { const p0 = h1 - .12 * (61 / L) ** .3, p1 = h1 - .01; ptop = pilotHouse(k, p0, p1, roof + .35, 7.2); pmid = L * (p0 + p1) / 2; }
        else { const p0 = .70, p1 = .81; ptop = D(L * .76) + 9.4; area(P([[L * p0, roof], [L * p0, ptop], [L * p1, ptop], [L * p1, D(L * p1)], ...range(L * p1, L * h1, 6).map(x => [x, D(x)]), [L * h1, roof]]) + 'Z', C.paper, 1.4);
          area(rect(L * p0 - .5, ptop, L * p1 + .5, ptop + .4), C.ink, .8); for (let i = 0; i < 3; i++) { const a = L * p0 + .7 + i * (L * (p1 - p0) - 1.4) / 3, b = a + (L * (p1 - p0) - 1.4) / 3 - .5; area(rect(a, ptop - 2.9, b, ptop - .7), C.glass, .9); } pmid = L * (p0 + p1) / 2; }
        lights(k, pmid, ptop + .4, 5.2); lab('A', 'Towing lights', pmid, ptop + 4.5); lab('A', 'Pilot house', pmid + 1.5, ptop - 2);
        if (o.searchlight) { k.circ(pmid + 2.2, ptop + 1.2, .7, C.brass, .9); lab('A', 'Searchlight', pmid + 2.2, ptop + 1.2); }
        const sx = .52, sd = 2.5 * z, st = stack(k, sx, sd, roof + .35, D(L * sx) + (o.stackH || 18) * z, { band: true, whistle: true, pipe: true }); lab('A', 'Stack', st.x, st.top + .3);
        // a yawl on the house roof
        const ya = L * (h0 + .03), yl = Math.min(13 * z, L * .25); yawl(k, ya, yl, roof + .35); lab('A', o.yawls ? 'Yawl boats' : 'Yawl', ya + yl / 2, roof + 1.6);
        // towing bitt and towing arches over the after deck
        const bx = L * .19; area(rect(bx - .6 * z, D(bx), bx + .6 * z, D(bx) + 3.4), C.tint, 1.2); area(rect(bx - 1.1 * z, D(bx) + 2.5, bx + 1.1 * z, D(bx) + 3.0), C.ink, .8); lab('A', 'Towing bitt', bx, D(bx) + 3.4);
        for (const f of [.05, .1, .15]) { const x = L * f; line(P([[x, D(x)], [x, D(x) + 4.3]]), 2); area(rect(x - .35, D(x) + 4.3, x + .35, D(x) + 4.65), C.ink, .6); }
        lab('A', 'Towing arches', L * .1, D(L * .1) + 4.5);
        // flagstaff, jackstaff, bow fender and anchor
        line(P([[.7, D(0)], [-.4 * z, D(0) + 7]]), 1.2); line(P([[L - .7, k.Db + 1.3], [L - .5, k.Db + 6]]), 1.2);
        const Db = k.Db, fe = `M${k.px(L + .1)},${k.py(Db - .2)}Q${k.px(L + 1.5 * z)},${k.py(Db - .6)} ${k.px(L + 1.2 * z)},${k.py((Db + T * .5) / 2)}Q${k.px(L + 1.1 * z)},${k.py(T * .55)} ${k.px(L - .3)},${k.py(T * .55)}`;
        line(fe, Math.max(4, .9 * z * k.s), C.rope); lab('A', 'Bow fender', L + .8 * z, Db - 1.5);
        anchor(k, L - 4.2 * z, D(L - 4.2 * z) - 1.6 * z, z);
        if (o.derrick) {
          const mx = L * .78, mb = D(mx), mt = mb + 26 * z, bx2 = L * .97, by2 = D(bx2) + 9 * z;
          area(rect(mx - .45 * z, mb, mx + .45 * z, mt), C.tint, 1.1);
          line(P([[mx, mb + 4 * z], [bx2, by2]]), 3.2); line(P([[mx, mt], [bx2, by2]]), .8); line(P([[bx2, by2], [bx2, by2 - 5 * z]]), .8);
          lab('A', 'Derrick for lifting wreckage', mx, mt - 2);
        }
        // inside: boiler, engine, shaft, fuel, forecastle
        const b0 = L * .43, b1 = L * .62, bt = Math.min(D(b0), D(b1)) - .4;
        if (o.scotch) { const n = o.boilers || 1, w = (b1 - b0) / n; for (let i = 0; i < n; i++) capsule(k, b0 + i * w + .5, 1.4 + yk(b0), b0 + (i + 1) * w - .5, Math.max(bt, 1.4 + yk(b0) + T * .8)); }
        else dash(rect(b0, 1.2 + yk(b0), b1, bt));
        dash(P([[L * sx, bt], [L * sx, roof]]));
        const e0 = L * .31, e1 = L * .41, ec = .41 * T + yk(e0), ne = o.cylinders || 1;
        for (let i = 0; i < ne; i++) { const a = e0 + .5 + i * (e1 - e0 - 1) / ne; dash(rect(a + .15, ec + .17 * T, a + (e1 - e0 - 1) / ne - .15, roof - .8)); }
        hidC((e0 + e1) / 2, ec, .16 * T); shaft(k, (e0 + e1) / 2, ec);
        dash(rect(L * .62 + .3, 1.6 + yk(L * .62), L * .70 - .3, D(L * .7) - .5));
        dash(rect(L * .84, 2.2 + yk(L * .84), L * .95, D(L * .84) - .5));
        lab('B', o.boilerLabel || 'Firebox boiler', (b0 + b1) / 2, T * .45, 1); lab('B', k.d.engineLabel, (e0 + e1) / 2, ec + .3 * T, 1);
        lab('B', 'Shaft', (e0 + k.pc[0]) / 2 + 1, (ec + k.pc[1]) / 2, 1); lab('B', o.fuel || 'Coal', L * .66, T * .5, 1); lab('B', 'Forecastle: bunks', L * .895, T * .64, 1);
        if (o.pumps) { dash(rect(L * .74, 1.8 + yk(L * .74), L * .82, D(L * .74) - .6)); lab('B', 'Wrecking pumps', L * .78, T * .5, 1); }
        // deck plan
        const hw = B / 2 - 2.4 * z;
        area(rectP(L * h0, -hw, L * h1, hw), C.tint, 1.3);
        if (o.onHouse) { const p0 = h1 - .12 * (61 / L) ** .3; area(rectP(L * p0, -hw + .6, L * (h1 - .01), hw - .6), C.paper, 1.3); }
        else area(Pp([[L * .70, -hw + .2], [L * .81, -hw + .5], [L * .81, hw - .5], [L * .70, hw - .2]]) + 'Z', C.paper, 1.3);
        k.circP(L * sx, 0, sd / 2, C.smoke); yawlPlan(k, ya, yl, Math.max(3.6, yl * .3));
        area(rectP(L * .44, -1.5 * z, L * .48, 1.5 * z), C.glass, .9);
        area(rectP(bx - .6 * z, -.6 * z, bx + .6 * z, .6 * z), C.tint, 1.2);
        for (const f of [.05, .1, .15]) { const x = L * f, w = hb(x) - .07 * T; line(`M${k.px(x)},${k.pz(-w)}Q${k.px(x - 1.6 * z)},${k.pz(0)} ${k.px(x)},${k.pz(w)}`, 2); }
        area(rectP(L * .86, -1.3 * z, L * .9, 1.3 * z), C.paper, 1);
        bollards(k, [[L * .92, -1], [L * .92, 1], [L * .06, -1], [L * .06, 1], [L * .6, -1], [L * .6, 1]]);
        if (o.derrick) { k.circP(L * .78, 0, .5 * z, C.tint); line(Pp([[L * .78, 0], [L * .97, 0]]), 3); }
      },
      sec(k, { Q, b, dk, sx, sy }) {
        const { line, area, dash, o, C } = k, hw = b - 2.4 * (k.L / 61) ** .55, hh = 6.3 * Math.max(1, .75 + .25 * (k.L / 61) ** .55);
        area(`M${Q(-hw, dk + .3)}L${Q(-hw, dk + hh)}Q${Q(0, dk + hh + .5)} ${Q(hw, dk + hh)}L${Q(hw, dk + .3)}`, C.paper, 1.3);
        for (const sg of [-1, 1]) area(`M${Q(sg * b, dk - .04 * k.T)}L${Q(sg * (b + .065 * k.T), dk - .04 * k.T)}L${Q(sg * (b + .065 * k.T), dk - .135 * k.T)}L${Q(sg * b, dk - .135 * k.T)}Z`, C.tint, 1);
        dash(`M${Q(-b * .38, .17 * k.T)}L${Q(-b * .38, dk - .4)}L${Q(b * .38, dk - .4)}L${Q(b * .38, .17 * k.T)}Z`);
        line(`M${Q(-b + .2, dk + .4)}L${Q(-b + .2, dk + 1.1)}M${Q(b - .2, dk + .4)}L${Q(b - .2, dk + 1.1)}M${Q(-b + .2, dk + 1.1)}L${Q(-hw - .5, dk + 1.1)}M${Q(b - .2, dk + 1.1)}L${Q(hw + .5, dk + 1.1)}`, 1);
      },
    },
    // ---------- the diesel tug ----------
    diesel: {
      top: g => g.D(g.L * .5) + 24,
      ext: g => [4, 4],
      secH: () => 14,
      draw(k) {
        const { L, B, T, D, P, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk } = k;
        area(P([...range(L * .72, L, 30).map(x => [x, D(x) + 2.2]), ...range(L, L * .72, 30).map(x => [x, D(x)])]) + 'Z', C.paper, 1.1);
        line(P(range(L * .12, L * .72, 30).map(x => [x, D(x) + 2.2])), 1); for (let x = L * .12; x < L * .72; x += 2.6) line(P([[x, D(x)], [x, D(x) + 2.2]]), .7);
        const roof = house(k, .26, .74, 7, { doors: [.08, .55], spacing: 3.6 });
        const ptop = pilotHouse(k, .55, .72, roof + .35, 7.4, { windows: 4 });
        const mx = L * .62; lights(k, mx, ptop + .4, 8, 3); lab('A', 'Mast and towing lights', mx, ptop + 7);
        lab('A', 'Wheelhouse', L * .66, ptop - 2.5);
        const st = stack(k, .47, 4.2, roof + .35, roof + 7.5, { rake: .1 }); lab('A', 'Exhaust funnel', st.x, st.top + .3);
        const bx = L * .2; area(rect(bx - .9, D(bx), bx + .9, D(bx) + 3.6), C.tint, 1.2); area(rect(bx - 1.5, D(bx) + 2.6, bx + 1.5, D(bx) + 3.2), C.ink, .8); lab('A', 'Towing bitt', bx, D(bx) + 3.6);
        const hx = L * .26; line(P([[hx, roof - 2.5], [hx - 1.6, roof - 3.4], [hx - 1.6, roof - 4.4]]), 2.2); lab('A', 'Towing hook', hx - 1, roof - 3.2);
        yawl(k, L * .29, 12, roof + .35); lab('A', 'Workboat', L * .29 + 6, roof + 1.5);
        const Db = k.Db, fe = `M${k.px(L + .1)},${k.py(Db - .2)}Q${k.px(L + 2)},${k.py(Db - .6)} ${k.px(L + 1.6)},${k.py((Db + T * .5) / 2)}Q${k.px(L + 1.4)},${k.py(T * .55)} ${k.px(L - .3)},${k.py(T * .55)}`;
        line(fe, Math.max(4, 1.1 * k.s), C.rope); lab('A', 'Bow fender', L + 1, Db - 1.5);
        line(P([[.7, D(0)], [-.6, D(0) + 8]]), 1.2); anchor(k, L - 5.5, D(L - 5.5) - 2, 1.2);
        const e0 = L * .38, e1 = L * .56, ec = .4 * T + yk(e0);
        dash(rect(e0, ec - .5, e1, D(e0) + 2.5)); hidC((e0 + e1) / 2, ec, .14 * T); shaft(k, e0 + 1, ec);
        dash(rect(L * .58, 1.2 + yk(L * .58), L * .7, D(L * .6) - .6)); dash(rect(L * .78, 2 + yk(L * .78), L * .94, D(L * .8) - .6)); dash(rect(L * .14, 1.4, L * .3, D(L * .2) - .6));
        lab('B', k.d.engineLabel || 'Diesel engine', (e0 + e1) / 2, T * .55, 1); lab('B', 'Fuel oil', L * .64, T * .4, 1); lab('B', 'Crew quarters', L * .86, T * .6, 1); lab('B', 'Stores and steering gear', L * .22, T * .55, 1);
        const hw = B / 2 - 2.6; area(rectP(L * .26, -hw, L * .74, hw), C.tint, 1.3); area(rectP(L * .55, -hw + .6, L * .72, hw - .6), C.paper, 1.3);
        area(`M${k.px(L * .47 - 2.1)},${k.pz(0)}a${2.1 * k.s},${1.5 * k.s} 0 1 0 ${4.2 * k.s},0a${2.1 * k.s},${1.5 * k.s} 0 1 0 ${-4.2 * k.s},0Z`, C.smoke, 1);
        yawlPlan(k, L * .29, 12, 4); area(rectP(bx - .9, -.9, bx + .9, .9), C.tint, 1.2); bollards(k, [[L * .92, -1], [L * .92, 1], [L * .07, -1], [L * .07, 1]]);
      },
      sec(k, { Q, b, dk }) { const hw = b - 2.6, { area, C } = k; area(`M${Q(-hw, dk + .3)}L${Q(-hw, dk + 7)}L${Q(hw, dk + 7)}L${Q(hw, dk + .3)}`, C.paper, 1.3); area(`M${Q(-hw + .6, dk + 7.3)}L${Q(-hw + .6, dk + 14.6)}L${Q(hw - .6, dk + 14.6)}L${Q(hw - .6, dk + 7.3)}Z`, C.paper, 1.3); },
    },
    // ---------- the open steam fish tug ----------
    fishOpen: {
      top: g => g.D(g.L * .5) + 17,
      ext: g => [3, 3],
      secH: () => 6,
      draw(k) {
        const { L, B, T, D, P, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk } = k;
        // a low bulwark all round
        area(P([...range(L * .02, L, 60).map(x => [x, D(x) + 1.5]), ...range(L, L * .02, 60).map(x => [x, D(x)])]) + 'Z', C.paper, 1.1);
        const roof = house(k, .3, .62, 6, { doors: [.1] });
        const ptop = D(L * .67) + 8.6; area(P([[L * .62, roof], [L * .62, ptop], [L * .72, ptop], [L * .72, D(L * .72)], [L * .62, D(L * .62)]]) + 'Z', C.paper, 1.4);
        area(rect(L * .62 - .5, ptop, L * .72 + .5, ptop + .4), C.ink, .8); for (let i = 0; i < 3; i++) { const a = L * .62 + .6 + i * (L * .1 - 1.2) / 3; area(rect(a, ptop - 2.7, a + (L * .1 - 1.2) / 3 - .45, ptop - .7), C.glass, .9); }
        lab('A', 'Pilot house', L * .67, ptop - 1.6);
        const st = stack(k, .46, 2.2, roof + .35, D(L * .46) + 16.5, { whistle: true }); lab('A', 'Stack', st.x, st.top + .3);
        const mx = L * .86; line(P([[mx, D(mx)], [mx, D(mx) + 11]]), 1.6); area(rect(mx - .4, D(mx) + 9.6, mx + .4, D(mx) + 10.5), C.lamp, .8);
        lab('A', 'Open fore deck: the nets come in over the side by hand', L * .8, D(L * .8) + 1.6); lab('A', 'Mast', mx, D(mx) + 8);
        for (let x = L * .06; x < L * .27; x += 3.4) area(rect(x, D(x) + .2, x + 2.8, D(x) + 2.4), C.tint, .9);
        lab('A', 'Net boxes on the after deck', L * .16, D(L * .16) + 2.4);
        line(P([[.6, D(0) + 1.5], [-.3, D(0) + 6.5]]), 1.1);
        const b0 = L * .42, b1 = L * .55; dash(rect(b0, 1 + yk(b0), b1, D(b0) + 3)); dash(P([[L * .46, D(L * .46) + 3], [L * .46, roof]]));
        const e0 = L * .33, e1 = L * .41, ec = .43 * T + yk(e0); dash(rect(e0 + .5, ec + 1, e1 - .5, D(e0) + 4)); hidC((e0 + e1) / 2, ec, .15 * T); shaft(k, (e0 + e1) / 2, ec);
        dash(rect(L * .74, 1.4 + yk(L * .74), L * .86, D(L * .74) - .4)); dash(rect(L * .87, 1.8 + yk(L * .87), L * .96, D(L * .87) - .4));
        lab('B', 'Firebox boiler', (b0 + b1) / 2, T * .45, 1); lab('B', k.d.engineLabel, (e0 + e1) / 2, ec + 1, 1); lab('B', 'Fish hold', L * .8, T * .55, 1); lab('B', 'Forepeak: bunks', L * .915, T * .7, 1);
        const hw = B / 2 - 2.2; area(rectP(L * .3, -hw, L * .62, hw), C.tint, 1.3); area(rectP(L * .62, -hw + .3, L * .72, hw - .3), C.paper, 1.3);
        k.circP(L * .46, 0, 1.1, C.smoke); k.circP(mx, 0, .45, C.tint);
        for (let x = L * .06; x < L * .27; x += 3.4) for (const sg of [-1, 1]) area(rectP(x, sg * .6, x + 2.8, sg * (hb(x + 1.4) - 1.2)), C.tint, .9);
        area(rectP(L * .77, -1.3, L * .81, 1.3), C.paper, 1); bollards(k, [[L * .93, -1], [L * .93, 1], [L * .03, -1], [L * .03, 1]]);
      },
      sec(k, { Q, b, dk }) { const { area, line, C } = k, hw = b - 2.2; area(`M${Q(-hw, dk + .3)}L${Q(-hw, dk + 6)}Q${Q(0, dk + 6.4)} ${Q(hw, dk + 6)}L${Q(hw, dk + .3)}`, C.paper, 1.3); line(`M${Q(-b, dk)}L${Q(-b, dk + 1.5)}M${Q(b, dk)}L${Q(b, dk + 1.5)}`, 1.3); },
    },
    // ---------- the enclosed fish tug: a house over the whole deck, the "turtle back" ----------
    fishEnclosed: {
      top: g => g.D(g.L * .5) + (g.o.gas ? 12 : g.o.oil ? 14 : 17.5) * Math.min(1, (g.L / 62) ** .5) + 1,
      ext: g => [Math.max(2, g.L * .04), 2],
      planName: 'Roof plan',
      secH: k => 6.5 * Math.min(1, (k.L / 62) ** .4),
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk, o } = k, z = Math.min(1, (L / 62) ** .4);
        const xa = L * .016, xb = L * .99, eave = 5 * z, crown = 6.5 * z;
        const shape = (x, h) => { const t = (x - xa) / (xb - xa); if (t < .3) { const u = (.3 - t) / .3; return h * Math.pow(Math.max(0, 1 - u ** 5), 1 / 5); } const u = (t - .3) / .7; return h * Math.pow(Math.max(0, 1 - u ** 2.6), 1 / 1.7); };
        const roofC = x => D(x) + shape(x, crown), roofE = x => D(x) + shape(x, eave), xs = range(xa, xb, 90);
        area(P([...xs.map(x => [x, roofC(x)]), ...xs.slice().reverse().map(x => [x, D(x)])]) + 'Z', C.paper, 1.4);
        line(P(xs.map(x => [x, roofE(x)]).filter(([x, y]) => y > D(x) + .4)), 1);
        const n0 = L * .785, n1 = L * (o.gas ? .86 : .84), s0 = L * .035, s1 = L * .095, sideDoor = L * (o.pilotAft ? .62 : .4);
        for (let x = xa + 4.5 * z; x < xb - 3; x += 3.6 * z) { if (x > n0 - 1.5 && x < n1 + 1.5 || Math.abs(x - sideDoor) < 1.6 || roofE(x) < D(x) + 4.2 * z) continue; k.circ(x, D(x) + 3.3 * z, .42 * z, C.glass, .9); }
        area(rect(sideDoor - .9, D(sideDoor) + .1, sideDoor + .9, D(sideDoor) + 4.7 * z), 'none', .9);
        area(rect(n0, D(n0) + .5, n1, D(n0) + 4.4 * z), '#efe3c7', 1.5); area(rect(s0, D(s0) + .4, s1, D(s0) + 3.6 * z), '#efe3c7', 1.3);
        lab('A', 'Net door: the nets come aboard here', (n0 + n1) / 2, D(n0) + 4.4 * z); lab('A', 'Setting door: nets go out over the stern', (s0 + s1) / 2 + .5, D(s0) + 3.6 * z);
        lab('A', o.steel ? 'Steel house over the whole deck' : 'Turtle-back house', L * .26, roofC(L * .26));
        const p0 = o.pilotAft ? .4 : .64, p1 = o.pilotAft ? .53 : .76, pb = roofC(L * (p0 + p1) / 2) - .3, ptop = pilotHouse(k, p0, p1, pb - .2, 4.2 * z);
        lights(k, L * (p0 + p1) / 2, ptop + .35, 3.9 * z, 1); lab('A', 'Pilot house', L * (p0 + p1) / 2 + 1.2, ptop - 1.5);
        const sxp = o.pilotAft ? .3 : .52;
        if (o.gas) { const ex = L * .5, eb = roofC(ex) - .2; line(P([[ex, eb], [ex, eb + 4.5]]), 2.4, C.smoke); area(rect(ex - .4, eb + 4.5, ex + .4, eb + 4.9), C.ink, .6); lab('A', 'Exhaust', ex, eb + 4); }
        else { const sh = o.oil ? 12.5 : 17.5; const st = stack(k, sxp, (o.oil ? 1.6 : 2.2) * z, roofC(L * sxp) - .2, D(L * sxp) + sh * z, { rake: .05, whistle: !o.oil }); lab('A', o.oil ? 'Exhaust stack' : 'Stack', st.x, st.top + .3); }
        line(P([[.7, D(0) + .2], [-.3 * z, D(0) + 5.5 * z]]), 1.1);
        // inside
        const nb0 = L * .11, nb1 = L * (o.pilotAft ? .26 : .32);
        for (let x = nb0; x < nb1 - 2; x += 3.2 * z) dash(rect(x + .2, D(x) - .2, x + 2.8 * z, D(x) + 1.8 * z));
        const lx = (n0 + n1) / 2; hidC(lx, D(lx) + 2.4 * z, .75 * z);
        lab('B', 'Net boxes', (nb0 + nb1) / 2, D(L * .2) + .8 * z, 1); lab('B', o.oil ? 'Powered net lifter' : o.gas ? 'Net lifter (from 1916)' : 'Net lifter (fitted from 1916)', lx, D(lx) + 1.6 * z, 1);
        if (o.gas || o.oil) {
          const e0 = L * (o.oil ? .3 : .42), e1 = L * (o.oil ? .42 : .54), ec = .45 * T + yk(e0); dash(rect(e0, ec - .3, e1, D(e0) + 2.2 * z)); hidC((e0 + e1) / 2, ec, .15 * T); shaft(k, e0 + .6, ec);
          dash(rect(L * .56, 1 + yk(L * .56), L * .66, D(L * .56) - .3));
          lab('B', k.d.engineLabel, (e0 + e1) / 2, ec + .5, 1); lab('B', o.oil ? 'Fish boxes and ice' : 'Fish boxes', L * .61, T * .5, 1);
          if (o.oil) { dash(rect(L * .68, 1.3 + yk(L * .68), L * .76, D(L * .68) - .4)); lab('B', 'Fuel oil', L * .72, T * .55, 1); }
          else { dash(rect(L * .66, 1.2 + yk(L * .66), L * .74, D(L * .66) - .4)); lab('B', 'Gasoline tank', L * .7, T * .55, 1); }
        } else {
          const b0 = L * .46, b1 = L * .57; dash(rect(b0, 1 + yk(b0), b1, D(b0) + 3.2)); dash(P([[L * sxp, D(L * sxp) + 3.2], [L * sxp, roofC(L * sxp)]]));
          const g0 = L * .35, g1 = L * .44, ec = .43 * T + yk(g0);
          for (const j of [0, 1]) { const a = g0 + .6 + j * (g1 - g0 - 1.2) / 2; dash(rect(a + .15, ec + 1.1, a + (g1 - g0 - 1.2) / 2 - .15, D(a) + 3.6)); }
          hidC((g0 + g1) / 2, ec, .16 * T); shaft(k, (g0 + g1) / 2, ec);
          dash(rect(L * .57 + .2, 1.6 + yk(L * .57), L * .63 - .2, D(L * .57) - .4));
          lab('B', 'Firebox boiler', (b0 + b1) / 2, T * .5, 1); lab('B', k.d.engineLabel, (g0 + g1) / 2, ec + 1.5, 1); lab('B', 'Fish boxes and ice', L * .6, T * .5, 1);
        }
        dash(rect(L * .885 + .2, 2 + yk(L * .885), L * .955, D(L * .885) - .4)); lab('B', 'Bunks and galley', L * .92, T * .58, 1);
        // roof plan
        const inset = x => Math.max(0, hb(x) - .06 * T), xsH = range(xa, xb, 80);
        area(Pp([...xsH.map(x => [x, -inset(x)]), ...xsH.slice().reverse().map(x => [x, inset(x)])]) + 'Z', C.tint, 1.3);
        for (let zz = -B / 2 + 1.2 * z; zz < B / 2 - 1; zz += 1.1 * z) { const pts = xsH.filter(x => inset(x) > Math.abs(zz) + .3).map(x => [x, zz]); if (pts.length > 1) line(Pp([pts[0], pts[pts.length - 1]]), .35, C.ink2); }
        const pw = B / 2 - 2.6 * z; area(rectP(L * p0, -pw, L * p1, pw), C.paper, 1.3);
        if (!o.gas) k.circP(L * sxp, 0, (o.oil ? .8 : 1.1) * z, C.smoke); else k.circP(L * .5, 0, .3, C.smoke);
        area(rectP(L * .25, -1.4 * z, L * .3, 1.4 * z), C.glass, .9);
        line(Pp([[n0, hb(n0) - .05 * T], [n1, hb(n1) - .05 * T]]), Math.max(3, .7 * k.s * z), C.band); line(Pp(range(s0, s1, 6).map(x => [x, hb(x) - .05 * T])), Math.max(3, .7 * k.s * z), C.band);
      },
      sec(k, { Q, b, dk }) { const { area, C } = k, z = Math.min(1, (k.L / 62) ** .4), iw = b - .06 * k.T; area(`M${Q(-iw, dk + .3)}L${Q(-iw, dk + 5 * z)}Q${Q(-iw * .55, dk + 6.75 * z)} ${Q(0, dk + 6.5 * z)}Q${Q(iw * .55, dk + 6.75 * z)} ${Q(iw, dk + 5 * z)}L${Q(iw, dk + .3)}`, C.paper, 1.3); k.dash(`M${Q(-b * .35, .17 * k.T)}L${Q(-b * .35, dk + 3)}L${Q(b * .35, dk + 3)}L${Q(b * .35, .17 * k.T)}Z`); },
    },
    // ---------- the Collingwood skiff: an open boat with two spritsails ----------
    skiff: {
      top: g => g.Db + 25,
      ext: g => [g.L * .16, g.L * .2],
      profileName: 'Sail plan and outboard profile', planName: 'Plan, looking down into her',
      secH: () => 0,
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, lab, range, hb, C, yk } = k;
        const fm = L * .86, mm = L * .47, g = x => D(x);
        // the foremast is the taller; each sail is laced to its mast and held out by a sprit to the peak; the mainsail is sheeted to a boom aft
        const fH = 25, mH = 21, bow = L + L * .17;
        sail(k, [[fm, g(fm) + 1.6], [fm, g(fm) + fH * .86], [fm - L * .35, g(fm) + fH * .98], [fm - L * .37, g(fm) + 2.2]]);
        line(P([[fm - .3, g(fm) + 2.4], [fm - L * .35, g(fm) + fH * .98]]), 2, C.rope);
        sail(k, [[mm, g(mm) + 1.8], [mm, g(mm) + mH * .86], [mm - L * .52, g(mm) + mH], [mm - L * .55, g(mm) + 2.4]]);
        line(P([[mm - .3, g(mm) + 2.6], [mm - L * .52, g(mm) + mH]]), 2, C.rope); line(P([[mm, g(mm) + 2.2], [mm - L * .56, g(mm) + 2.4]]), 1.6, C.rope);
        sail(k, [[fm + .3, g(fm) + fH * .78], [bow - .5, g(L) + .6], [fm + 2.2, g(fm) + 2.3]]);
        line(P([[fm, g(fm)], [fm, g(fm) + fH]]), 2.2); line(P([[mm, g(mm)], [mm, g(mm) + mH]]), 2.2);
        line(P([[L - .2, g(L) - .3], [bow, g(L) + .5]]), 2);
        lab('A', 'Foresail (spritsail)', fm - L * .17, g(fm) + fH * .55); lab('A', 'Sprit', fm - L * .26, g(fm) + fH * .7); lab('A', 'Jib', fm + L * .1, g(fm) + fH * .3);
        lab('A', 'Mainsail, the after mast the shorter', mm - L * .25, g(mm) + mH * .55); lab('A', 'Bowsprit', L + L * .1, g(L) + .2);
        // rudder and tiller, centreboard, thwarts
        const rx = L * .03; area(P([[rx, T * 1.1], [rx - 1.4, T * .9], [rx - 1.7, -T * .25], [rx - .1, -T * .2]]) + 'Z', C.tint, 1.1);
        line(P([[rx, D(rx) + .4], [rx + 3.5, D(rx) + 1]]), 1.6); lab('B', 'Rudder and tiller', rx - .8, T * .3);
        dash(rect(L * .5, -T * .6, L * .64, yk(L * .57))); lab('B', 'Centreboard, lowered', L * .57, -T * .3, 1);
        dash(rect(L * .5, yk(L * .55), L * .64, D(L * .57) - .3)); lab('B', 'Centreboard trunk', L * .61, D(L * .6) - 1.2, 1);
        lab('B', 'Clinker planking', L * .3, T * .9);
        // plan: an open boat, thwarts across, the masts, oars along the side, the catch in boxes
        for (const f of [.2, .47, .62, .86]) { const x = L * f, w = hb(x) - .25; area(rectP(x - .45, -w, x + .45, w), C.tint, .9); }
        area(rectP(L * .5, -.25, L * .64, .25), C.paper, .9);
        k.circP(fm, 0, .3, C.ink); k.circP(mm, 0, .27, C.ink); line(Pp([[L, 0], [bow, 0]]), 2);
        for (const sg of [-1, 1]) line(Pp([[L * .28, sg * (hb(L * .5) - .5)], [L * .72, sg * (hb(L * .5) - .7)]]), 1.4, C.rope);
        area(rectP(L * .27, -1.6, L * .4, 1.6), C.tint, .9);
        for (let x = L * .03 + 1; x < L * .97; x += 1.2) { const w = hb(x) - .15; if (w > .2) line(Pp([[x, -w], [x, w]]), .3, C.ink2); }
        line(Pp([[rx + 3.5, 0], [rx, 0]]), 1.6);
      },
      sec(k, { Q, b, dk }) { const { line, area, C } = k; line(`M${Q(-b * .97, dk * .78)}L${Q(b * .97, dk * .78)}`, 2.2); area(`M${Q(-.2, 0)}L${Q(-.2, dk * .6)}L${Q(.2, dk * .6)}L${Q(.2, 0)}`, C.tint, 1); },
    },
    // ---------- the schooners ----------
    schooner: {
      top: g => g.Db + g.L * .78,
      ext: g => [g.L * .05, g.L * .3],
      profileName: 'Sail plan and outboard profile',
      secH: () => 2,
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, lab, range, hb, C, yk, d } = k, n = d.o.masts || 2;
        const xs = n === 3 ? [.72, .5, .28] : [.66, .38], mastH = L * .66, top = L * .78, jib = L + L * .27;
        const names = n === 3 ? ['Foresail', 'Mainsail', 'Mizzen'] : ['Foresail', 'Mainsail'];
        // gaff sails and topsails
        xs.forEach((f, i) => {
          const x = L * f, base = D(x), boomY = base + 5, throat = base + mastH * .82, aft = i === xs.length - 1 ? Math.max(L * .02, x - L * .36) : L * xs[i + 1] + 3, peak = throat + mastH * .2;
          sail(k, [[x, boomY], [x, throat], [aft + (x - aft) * .3, peak], [aft, boomY + .5]]);
          line(P([[x, throat], [aft + (x - aft) * .3, peak]]), 2, C.rope); line(P([[x, boomY], [aft - (i === xs.length - 1 ? L * .04 : 0), boomY + .5]]), 2, C.rope);
          sail(k, [[x, throat + 1.5], [x, base + top - 3], [aft + (x - aft) * .3 + 1, peak - 1]]);
          line(P([[x, base], [x, base + top]]), 2.6); line(P([[x, base + mastH * .86], [x - .4, base + top]]), 1.8);
          for (const sg of [-1]) line(P([[x, base + mastH * .82], [x - L * .05, D(x - L * .05) + .3]]), .6, C.ink2);
          lab('A', names[i], (x + aft) / 2, base + mastH * .45);
        });
        lab('A', 'Gaff topsail', L * xs[0] - 4, D(L * xs[0]) + top - 8);
        // headsails on the bowsprit and jibboom
        const fx = L * xs[0], fb = D(fx);
        sail(k, [[fx + 1, fb + mastH * .8], [L - .3, D(L) + 1], [fx + 4, fb + 4]]);
        sail(k, [[fx + 1.5, fb + mastH * .95], [L + L * .14, D(L) + 3], [L + L * .02, D(L) + 2.5]]);
        sail(k, [[fx + 2, fb + top - 4], [jib - 2, D(L) + 6], [L + L * .12, D(L) + 4.5]]);
        line(P([[L - .5, D(L)], [jib, D(L) + 7]]), 2.4); line(P([[fx, fb + top], [jib, D(L) + 7]]), .7);
        lab('A', 'Jibs and staysail', L + L * .08, D(L) + mastH * .35); lab('A', 'Bowsprit and jibboom', L + L * .2, D(L) + 5);
        // cabin aft, hatches between the masts, windlass, the yawl on davits at the stern
        house(k, .05, .2, 6.5, { doors: [.85], spacing: 4 });
        const hs = n === 3 ? [.36, .6, .82] : [.24, .52, .8];
        for (const f of hs) { const x = L * f; area(rect(x - 3, D(x), x + 3, D(x) + 1.6), C.tint, 1); }
        area(rect(L * .88, D(L * .88), L * .92, D(L * .88) + 2.2), C.tint, 1); lab('A', 'Windlass', L * .9, D(L * .9) + 2.2);
        line(P([[1.5, D(0) + 1], [-L * .03, D(0) + 6]]), 1.6); line(P([[-L * .03, D(0) + 6], [-L * .03, D(0) + 4]]), 1); yawl(k, -L * .045, Math.min(16, L * .13), D(0) + 2.4); lab('A', 'Yawl boat on stern davits', -L * .045 + 6, D(0) + 4);
        lab('A', 'Hatches', L * hs[1], D(L * hs[1]) + 1.6);
        const cb0 = L * .4, cb1 = L * .58; dash(rect(cb0, -T * .55, cb1, yk(cb0))); dash(rect(cb0, yk(cb0), cb1, D(cb0) - .3));
        dash(rect(L * .22, 1, L * .86, D(L * .5) - .5));
        lab('B', 'Centreboard: lowered to sail to windward', (cb0 + cb1) / 2, -T * .3, 1); lab('B', 'Hold: lumber, coal or grain', L * .7, T * .55, 1);
        // plan
        fillHull(k, .05, .2, 4, C.tint, 1.3); hatchesP(k, ...(n === 3 ? [.3, .88, 3] : [.18, .86, 3]), B * .3, 6);
        for (const f of xs) k.circP(L * f, 0, .6, C.tint, 1.2);
        line(Pp([[L - .5, 0], [jib, 0]]), 2.4); area(rectP(L * .88, -1.5, L * .92, 1.5), C.tint, 1);
        dash(`M${k.px(cb0)},${k.pz(-.5)}L${k.px(cb1)},${k.pz(-.5)}L${k.px(cb1)},${k.pz(.5)}L${k.px(cb0)},${k.pz(.5)}Z`);
        for (const sg of [-1, 1]) for (const f of xs) line(Pp([[L * f - L * .05, sg * hb(L * f - L * .05)], [L * f, sg * .6]]), .5, C.ink2);
        bollards(k, [[L * .95, -1], [L * .95, 1], [L * .04, -1], [L * .04, 1]]);
      },
      sec(k, { Q, b, dk }) { const { area, line, C } = k; area(`M${Q(-b * .3, dk)}L${Q(-b * .3, dk + 1.6)}L${Q(b * .3, dk + 1.6)}L${Q(b * .3, dk)}Z`, C.tint, 1.1); area(`M${Q(-.5, 0)}L${Q(-.5, dk - .3)}L${Q(.5, dk - .3)}L${Q(.5, 0)}`, C.tint, 1); line(`M${Q(-b, dk)}L${Q(-b, dk + 2)}M${Q(b, dk)}L${Q(b, dk + 2)}`, 1.4); },
    },
    // ---------- the wooden steam barge, a "lumber hooker" ----------
    steambarge: {
      top: g => g.D(g.L * .9) + 34,
      ext: g => [g.L * .03, g.L * .03],
      secH: () => 9,
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk } = k;
        // forecastle and pilot house forward, engine house aft, the deck load of lumber between
        const fo = house(k, .9, .995, 7, { windows: false, doors: [] }), ptop = pilotHouse(k, .905, .975, fo + .35, 8, { windows: 4 });
        lights(k, L * .94, ptop + .4, 4); lab('A', 'Pilot house', L * .94, ptop - 3);
        const aft = house(k, .02, .2, 8, { doors: [.4, .8], spacing: 3.8 });
        const st = stack(k, .14, 4.5, aft + .35, D(L * .14) + 34, { whistle: true, pipe: true }); lab('A', 'Stack', st.x, st.top + .3);
        yawl(k, L * .03, 16, aft + .35); lab('A', 'Yawl boat', L * .03 + 8, aft + 1.6);
        const lx0 = L * .23, lx1 = L * .88, lh = 9;
        area(P([[lx0, D(lx0)], ...range(lx0, lx1, 20).map(x => [x, D(x) + lh]), [lx1, D(lx1)]]) + 'Z', C.lumber, 1.2);
        for (let y = 1.5; y < lh; y += 1.5) line(P(range(lx0, lx1, 20).map(x => [x, D(x) + y])), .5, C.ink2);
        for (let x = lx0 + 6; x < lx1; x += 12) line(P([[x, D(x)], [x, D(x) + lh]]), .5, C.ink2);
        lab('A', 'Deck load of lumber, more in the hold', (lx0 + lx1) / 2, D((lx0 + lx1) / 2) + lh);
        for (const f of [.86, .5]) { const x = L * f; line(P([[x, D(x) + lh], [x, D(x) + lh + 22]]), 2.4); line(P([[x, D(x) + lh + 2], [x - L * .1, D(x) + lh + 1]]), 1.6, C.rope); }
        lab('A', 'Masts with cargo booms', L * .5, D(L * .5) + lh + 15);
        const tx = L * .015; area(rect(tx - .8, D(tx), tx + .8, D(tx) + 4), C.tint, 1.1); lab('A', 'Towing post for her schooner-barges', tx, D(tx) + 3.5);
        anchor(k, L - 7, D(L - 7) - 3, 2);
        const b0 = L * .1, b1 = L * .2; dash(rect(b0, 1.5, b1, D(b0) - .8)); dash(P([[L * .14, D(b0) - .8], [L * .14, aft]]));
        const e0 = L * .045, e1 = L * .095, ec = T * .4; dash(rect(e0, ec + 1, e1, aft - 1)); hidC((e0 + e1) / 2, ec, .1 * T); shaft(k, (e0 + e1) / 2, ec);
        dash(rect(L * .22, 1, L * .88, D(L * .5) - .6));
        lab('B', 'Firebox boilers', (b0 + b1) / 2, T * .4, 1); lab('B', 'Compound engine', (e0 + e1) / 2, ec + 1.5, 1); lab('B', 'Hold', L * .55, T * .5, 1);
        fillHull(k, .9, .995, 1, C.tint); area(rectP(L * .905, -B * .2, L * .975, B * .2), C.paper, 1.2);
        fillHull(k, .02, .2, 3, C.tint); k.circP(L * .14, 0, 2.25, C.smoke);
        fillHull(k, lx0 / L, lx1 / L, 1.2, C.lumber, 1.1); for (let x = lx0 + 12; x < lx1; x += 12) line(Pp([[x, -hb(x) + 1.2], [x, hb(x) - 1.2]]), .5, C.ink2);
        for (const f of [.86, .5]) k.circP(L * f, 0, .8, C.tint, 1.2);
      },
      sec(k, { Q, b, dk }) { const { area, line, C } = k; area(`M${Q(-b + 1.2, dk)}L${Q(-b + 1.2, dk + 9)}L${Q(b - 1.2, dk + 9)}L${Q(b - 1.2, dk)}Z`, C.lumber, 1.2); for (let y = 1.5; y < 9; y += 1.5) line(`M${Q(-b + 1.2, dk + y)}L${Q(b - 1.2, dk + y)}`, .5, C.ink2); },
    },
    // ---------- the steel freighters: lakers and canallers ----------
    laker: {
      top: g => g.D(g.L * .05) + 50 * (g.L / 450) ** .4,
      ext: g => [g.L * .02, g.L * .02],
      secH: () => 4,
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, hidC, lab, range, hb, C, yk } = k, z = (L / 450) ** .4;
        // forecastle with the texas and pilot house right forward; the after house with the engines and the stack; hatches between
        const fcl = L * (k.d.o.canaller ? .9 : .93), fo = D(fcl) + 8 * z;
        area(P([[fcl, D(fcl)], [fcl, fo], [L, fo + 1], [L, D(L)]]) + 'Z', C.paper, 1.3);
        const tex = house(k, .935, .975, 8 * z, { base: fo, windows: true, spacing: 4, doors: [] }), ptop = pilotHouse(k, .94, .972, tex + .35, 8 * z, { windows: 5 });
        lab('A', 'Pilot house over the texas', L * .956, ptop - 3);
        const ah = house(k, .01, .11, 9 * z, { doors: [.3, .7], spacing: 4.5 }), ah2 = house(k, .02, .09, 8 * z, { base: ah + .35, doors: [.5], spacing: 4.5 });
        for (const x of [L * .025, L * .085]) yawl(k, Math.max(1, x - 9), 18, ah2 + .35); lab('A', 'Lifeboats', L * .03, ah2 + 2);
        const st = stack(k, .065, 9 * z, ah2 + .35, D(L * .065) + 50 * z - 4, { band: false, whistle: true }); lab('A', 'Stack', st.x, st.top + .3);
        for (const f of [.95, .1]) { const x = L * f, b0 = f > .5 ? ptop : ah2; line(P([[x, b0], [x, b0 + 28 * z]]), 2.2); }
        lab('A', 'Masts', L * .1, ah2 + 18 * z);
        const h0 = L * .13, h1 = fcl - 8, n = Math.max(6, Math.round((h1 - h0) / 24));
        for (let i = 0; i < n; i++) { const x = h0 + (h1 - h0) * (i + .5) / n; area(rect(x - 5, D(x), x + 5, D(x) + 2.5), C.tint, 1); }
        lab('A', `${n} hatches, 24 feet apart`, (h0 + h1) / 2, D((h0 + h1) / 2) + 2.5);
        anchor(k, L - 10, D(L - 10) - 5, 3);
        dash(P([[h0, 4], [h1, 4]])); for (let i = 1; i < 4; i++) { const x = h0 + (h1 - h0) * i / 4; dash(P([[x, 4], [x, D(x) - .5]])); }
        dash(rect(L * .02, 4, L * .12, D(L * .05) - 1)); hidC(L * .05, T * .35, .1 * T); shaft(k, L * .05, T * .35);
        lab('B', 'Cargo holds: iron ore, coal or grain', (h0 + h1) / 2, T * .5, 1); lab('B', 'Water ballast in the double bottom', L * .3, 2, 1); lab('B', 'Triple-expansion engine and Scotch boilers', L * .07, T * .6, 1);
        fillHull(k, fcl / L, .995, .5, C.tint); area(rectP(L * .94, -B * .22, L * .972, B * .22), C.paper, 1.2);
        fillHull(k, .01, .11, 2, C.tint); area(`M${k.px(L * .065 - 4.5 * z)},${k.pz(0)}a${4.5 * z * k.s},${3.2 * z * k.s} 0 1 0 ${9 * z * k.s},0a${4.5 * z * k.s},${3.2 * z * k.s} 0 1 0 ${-9 * z * k.s},0Z`, C.smoke, 1);
        hatchesP(k, h0 / L, h1 / L, n, B * .62, 10);
      },
      sec(k, { Q, b, dk }) { const { area, dash, C } = k; area(`M${Q(-b * .31, dk)}L${Q(-b * .31, dk + 2.5)}L${Q(b * .31, dk + 2.5)}L${Q(b * .31, dk)}Z`, C.tint, 1.1); dash(`M${Q(-b + .5, 4)}L${Q(b - .5, 4)}`); dash(`M${Q(-b + 4, dk - .5)}L${Q(-b + 4, 4)}M${Q(b - 4, dk - .5)}L${Q(b - 4, 4)}`); },
    },
    // ---------- the upper-lake passenger steamer ----------
    passenger: {
      top: g => g.D(g.L * .5) + 62,
      ext: g => [g.L * .02, g.L * .02],
      secH: () => 26,
      draw(k) {
        const { L, B, T, D, P, Pp, rect, rectP, area, line, dash, hidC, lab, range, hb, C } = k, z = (L / 300) ** .3;
        // the hull's side ports, then two decks of cabins and the boat deck
        for (let x = L * .1; x < L * .9; x += 7) k.circ(x, D(x) - 4, .7, C.glass, .7);
        const base = D(L * .5), d1 = house(k, .1, .9, 9, { base, spacing: 4.2, doors: [.15, .5, .85] }), d2 = house(k, .16, .84, 8.5, { base: d1 + .35, spacing: 4.2, doors: [.3, .7] });
        const ptop = pilotHouse(k, .8, .86, d2 + .35, 8.5, { windows: 5 });
        lab('A', 'Pilot house', L * .83, ptop - 3); lab('A', 'Dining saloon and staterooms', L * .5, d1 - 3); lab('A', 'Promenade deck', L * .35, d2 - 2);
        const st = stack(k, .5, 12 * z, d2 + .35, D(L * .5) + 60, { band: true, whistle: true }); lab('A', 'Stack', st.x, st.top + .3);
        for (const f of [.93, .12]) { const x = L * f, b0 = f > .5 ? D(x) : d2; line(P([[x, b0], [x, b0 + (f > .5 ? 52 : 40)]]), 2); }
        lab('A', 'Masts', L * .12, d2 + 30);
        for (const f of [.2, .3, .62, .72]) yawl(k, L * f - 9, 20, d2 + .35); lab('A', 'Lifeboats', L * .25, d2 + 3);
        const e0 = L * .38, e1 = L * .48, ec = T * .4; dash(rect(e0, 2, e1, D(e0) - 1)); hidC((e0 + e1) / 2, ec, .1 * T); shaft(k, e0, ec);
        dash(rect(L * .5, 2, L * .62, D(L * .5) - 1)); dash(rect(L * .65, 2, L * .9, D(L * .7) - 1));
        lab('B', 'Engine', (e0 + e1) / 2, T * .7, 1); lab('B', 'Boilers', L * .56, T * .6, 1); lab('B', 'Package freight below', L * .78, T * .5, 1);
        fillHull(k, .1, .9, 1.5, C.tint); fillHull(k, .16, .84, 4, C.paper);
        area(rectP(L * .8, -B * .25, L * .86, B * .25), C.tint, 1.2); k.circP(L * .5, 0, 6 * z, C.smoke);
        for (const f of [.2, .3, .62, .72]) for (const sg of [-1, 1]) yawlPlan(k, L * f - 9, 20, 6, sg * (B / 2 - 7));
      },
      sec(k, { Q, b, dk }) { const { area, C } = k; area(`M${Q(-b + 1.5, dk)}L${Q(-b + 1.5, dk + 9)}L${Q(b - 1.5, dk + 9)}L${Q(b - 1.5, dk)}Z`, C.paper, 1.2); area(`M${Q(-b + 4, dk + 9.35)}L${Q(-b + 4, dk + 18)}L${Q(b - 4, dk + 18)}L${Q(b - 4, dk + 9.35)}Z`, C.paper, 1.2); },
    },
  };
  DRESS.wrecker = DRESS.tug;

  // What to draw for each boat you can buy, and for each kind of lake ship
  const BOATS = {
    woodsimple: ['tug', { fuel: 'Cordwood', engine: 'Engine: one cylinder' }],
    woodcompound: ['tug', { onHouse: 1, stackH: 22, cylinders: 2, engine: 'Steeple compound engine' }],
    steelcompound: ['tug', { onHouse: 1, steel: 1, scotch: 1, stackH: 20, cylinders: 2, boilerLabel: 'Scotch boiler', engine: 'Fore-and-aft compound engine' }],
    steelwrecker: ['wrecker', { onHouse: 1, steel: 1, scotch: 1, boilers: 2, stackH: 24, cylinders: 3, boilerLabel: 'Two Scotch boilers', engine: 'Triple-expansion engine', derrick: 1, pumps: 1, searchlight: 1, yawls: 1 }],
    diesel: ['diesel', { steel: 1, engine: 'Enterprise diesel engine' }],
    skiff: ['skiff', {}],
    steamfish: ['fishOpen', { engine: 'Engine: one cylinder' }],
    liftertug: ['fishEnclosed', { engine: 'Compound engine' }],
    gasfish: ['fishEnclosed', { gas: 1, engine: 'Gasoline engine' }],
    dieselfish: ['fishEnclosed', { oil: 1, steel: 1, pilotAft: 1, engine: 'Kahlenberg oil engine' }],
  };
  const SHIPS = { schooner2: ['schooner', { masts: 2 }], schooner3: ['schooner', { masts: 3 }], steambarge: ['steambarge', { wood: 1 }], laker: ['laker', {}], canaller: ['laker', { canaller: 1 }], passenger: ['passenger', {}] };
  function boatDef(id, m) {
    const [kind, o] = BOATS[id], sp = m.spec;
    const eng = o.engine ? `${o.engine}${sp.cyl ? ', ' + sp.cyl : ''}` : '';
    return { kind, o, L: sp.len, B: sp.beam, T: sp.draft, title: m.name, corner: `From ${m.year}`, sub: `Modelled on ${sp.like}`, engineLabel: eng,
      rows: [['Length overall', ftIn(sp.len)], ['Beam', ftIn(sp.beam)], ['Draft', ftIn(sp.draft) + (sp.draftNote ? `, ${sp.draftNote}` : '')],
        [m.sail ? 'Rig' : 'Engine', m.sail ? sp.rig : sp.engine + (sp.cyl ? `, ${sp.cyl}` : '')], [m.sail ? 'Hull' : 'Power', m.sail ? sp.hull : `${sp.hp}${sp.rpm ? ' at ' + sp.rpm : ''}`],
        ...(m.sail ? [] : [['Boiler', sp.boiler]]), ['Crew', sp.crew]] };
  }
  function shipDef(v, T) {
    const [kind, o] = SHIPS[v.type];
    return { kind, o, L: v.lenFt, B: v.beamFt, T: v.draftFt, title: T.name, corner: `Built ${v.built}`, sub: `The ${v.name}, built at ${v.place} in ${v.built}`,
      rows: [['Length', `${v.lenFt} ft`], ['Beam', `${v.beamFt} ft`], ['Draft, loaded', ftIn(v.draftFt)], [T.sail ? 'Rig' : 'Engine', T.sail ? T.rig : T.engine], ['Crew', T.crew]] };
  }
  return { sheet, boatDef, shipDef, BOATS, SHIPS };
})();
if (typeof module !== 'undefined') module.exports = PLAN;
