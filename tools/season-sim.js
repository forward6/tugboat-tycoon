// Fast-forward whole seasons headless with a simple bot, to check balance and catch crashes.
const { chromium } = require('playwright');
const path = require('path');
const strategy = process.argv[2] || 'passive';
const seed = +(process.argv[3] || 42);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(800);
  const res = await p.evaluate(([strategy, seed]) => {
    const T = window.__tugboat;
    T.newGame(seed);
    const S = () => T.S;
    const log = [];
    const routes = [['collingwood', 'parrysound', 'french'], ['french', 'waubaushene'], ['owensound', 'killarney', 'littlecurrent'], ['spanish', 'midland'], ['gateway', 'owensound'], ['byng', 'collingwood'], ['moonriver', 'midland', 'collingwood']];
    const grounds = ['fishingislands', 'nottawasaga', 'killarneyg', 'midbay', 'lonely', 'mainchannel'];
    let ri = 0, gi = 0;
    const t0 = performance.now();
    for (let yr = 0; yr < 31 && !S().over; yr++) {
      const st = S();
      // bot spending at start of each season
      if (strategy !== 'passive') {
        for (let k = 0; k < 3; k++) {
          const y = st.year;
          const tow = y >= 1936 ? 'diesel' : y >= 1891 ? 'steelcompound' : 'woodsimple';
          if (st.cash > T.MODELS[tow].price + 4000 && ri < 40) {
            T.buyTug(tow, 'collingwood'); const t = st.tugs[st.tugs.length - 1]; T.saveRoute(t, routes[ri % routes.length]); ri++;
          } else if (st.cash > 7000 && gi < 8) {
            T.buyTug(y >= 1930 ? 'dieselfish' : y >= 1909 ? 'gasfish' : y >= 1874 ? 'steamfish' : 'skiff', 'owensound'); const t = st.tugs[st.tugs.length - 1]; T.assignGround(t, grounds[gi % grounds.length]); gi++;
          }
        }
        T.ui.mode = null;
      }
      // run the season
      let guard = 0;
      while (st.season && guard++ < 400) T.simAdvance(1);
      const L = st.history[st.history.length - 1];
      const fish = Object.entries(st.grounds).map(([k, g]) => Math.round(g.stock / T.GROUND[k].K * 100));
      log.push({ y: st.year, cash: Math.round(st.cash), nw: Math.round(T.netWorth()), rev: Math.round(L.rev), cost: Math.round(L.cost), fleet: L.fleet,
        rivals: st.tugs.filter(t => t.owner === 'r').length, fish: fish.join(' '), led: Object.fromEntries(Object.entries(st.ledger).filter(([k, v]) => v && k !== 'year').map(([k, v]) => [k, Math.round(v)])) });
      if (st.year >= 1960) break;
      T.startSeason();
    }
    return { log, ms: Math.round(performance.now() - t0) };
  }, [strategy, seed]);
  for (const r of res.log) console.log(r.y, 'cash', r.cash, 'nw', r.nw, 'rev', r.rev, 'cost', r.cost, 'fleet', r.fleet, 'rivals', r.rivals, '| fish%', r.fish);
  console.log('last ledger', JSON.stringify(res.log[res.log.length - 1].led));
  console.log('first ledger', JSON.stringify(res.log[0].led));
  console.log('ms', res.ms, 'errors', errs.slice(0, 5));
  await b.close();
})();
