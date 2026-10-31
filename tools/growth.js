// A greedy bot plays 1870-1900: keeps buying tugs on decent routes and a few fish tugs. Prints yearly results.
const { chromium } = require('playwright');
const path = require('path');
const seed = +(process.argv[2] || 3), cautious = process.argv[3] !== 'bold', maxTow = +(process.argv[4] || 99);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(800);
  const res = await p.evaluate(([seed, cautious, maxTow]) => {
    const T = window.__tugboat; T.newGame(seed); const S = T.S; const log = [];
    const routes = [['spanish', 'midland'], ['collingwood', 'littlecurrent', 'spanish'], ['owensound', 'byng', 'french', 'parrysound'], ['gateway', 'owensound'], ['french', 'baycity'],
      ['moonriver', 'waubaushene', 'collingwood'], ['french', 'midland'], ['gateway', 'collingwood'], ['byng', 'collingwood'], ['owensound', 'killarney', 'littlecurrent'],
      ['french', 'parrysound'], ['spanish', 'penetang'], ['meaford', 'parrysound', 'byng'], ['southampton', 'gateway'], ['french', 'gateway']];
    const grounds = ['fishingislands', 'killarneyg', 'midbay', 'nottawasaga', 'lonely'];
    let ri = 0, gi = 0, sunk = 0;
    const shop = () => {
      const y = S.year;
      for (const t of S.tugs.filter(t => t.owner === 'p' && (S.day - t.bought) / 365 > 35)) { S.cash += t.price * .25; S.tugs.splice(S.tugs.indexOf(t), 1); }
      for (let k = 0; k < 6; k++) {
        const tow = y >= 1936 ? 'diesel' : y >= 1891 ? 'steelcompound' : y >= 1879 ? 'woodcompound' : 'woodsimple';
        const fishM = y >= 1930 ? 'dieselfish' : y >= 1909 ? 'gasfish' : y >= 1903 ? 'liftertug' : y >= 1874 ? 'steamfish' : 'skiff';
        const nFish = S.tugs.filter(t => t.owner === 'p' && T.MODELS[t.model].kind === 'fish').length;
        if (S.loans + 5000 <= 20000 + .4 * Math.max(0, T.netWorth() + S.loans) && S.cash < T.MODELS[tow].price + 1000 && S.loans < 15000) { S.loans += 5000; S.cash += 5000; }
        const nTow = S.tugs.filter(t => t.owner === 'p' && T.MODELS[t.model].kind === 'tow').length;
        if (S.cash > T.MODELS[tow].price + 1500 && nTow < maxTow) { T.buyTug(tow, 'collingwood'); const t = S.tugs[S.tugs.length - 1]; T.saveRoute(t, routes[ri++ % routes.length]); if (!cautious) t.stance = 'bold'; }
        else if (nFish < 4 && S.cash > T.MODELS[fishM].price + 1500) { T.buyTug(fishM, 'owensound'); const t = S.tugs[S.tugs.length - 1]; T.assignGround(t, grounds[gi++ % grounds.length]); if (!cautious) t.stance = 'bold'; }
        else break;
      }
      if (S.cash > 4000 && !S.ports.collingwood.built.icehouse) { S.cash -= 1200; S.ports.collingwood.built.icehouse = true; }
      if (S.cash > 15000 && S.loans) { S.cash -= S.loans; S.loans = 0; }
      T.ui.mode = null;
    };
    for (let yr = 0; yr < 91 && !S.over; yr++) {
      shop();
      let guard = 0, before = S.tugs.filter(t => t.owner === 'p').length, bought = 0;
      while (S.season && guard++ < 400) { T.simAdvance(1); if (guard === 90) { const n0 = S.tugs.length; shop(); bought += S.tugs.length - n0; } }
      sunk += Math.max(0, before + bought - S.tugs.filter(t => t.owner === 'p').length);
      const L = S.history[S.history.length - 1];
      log.push({ y: S.year, cash: Math.round(S.cash), loans: S.loans, nw: Math.round(T.netWorth()), rev: Math.round(L.rev), cost: Math.round(L.cost), fleet: L.fleet, rivals: S.tugs.filter(t => t.owner === 'r').length,
        fish: Object.entries(S.grounds).map(([k, g]) => Math.round(g.stock / T.GROUND[k].K * 100)).join(' ') });
      if (S.year >= +(window.__endYear || 1960)) break;
      T.startSeason();
    }
    return { log, sunk };
  }, [seed, cautious, maxTow]);
  for (const r of res.log) console.log(r.y, 'nw', String(r.nw).padStart(7), 'cash', String(r.cash).padStart(7), 'loans', r.loans, 'rev', r.rev, 'cost', r.cost, 'fleet', r.fleet, 'rivals', r.rivals, '| fish%', r.fish);
  console.log('boats lost', res.sunk, 'errors', errs.slice(0, 3));
  await b.close();
})();
