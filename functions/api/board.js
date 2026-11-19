// The scoreboard (at /api/board): each game reports who is playing it, how far they have got and how long they have
// played; anyone can read the board. For each player it keeps the game they are playing now and their best game (the most
// any of their companies has been worth), so starting over never lowers their place. Kept in the D1 database (DB); a
// report must carry the device's key, so no one can post as another player from the ids on the board.
import { json, clip, num, ensure, playerFor, parseJSON, playerInfo, sweep } from '../../server/lib.js';
import { nameOK, settlerName } from '../../server/names.js';
import * as legacy from '../../server/legacy-board.js';

// how many of each kind of boat: a few dozen kinds at most, each a short lowercase name
const cleanFleet = f => { if (!f || typeof f !== 'object') return null; const o = {}; for (const [k, v] of Object.entries(f).slice(0, 30)) { const n = num(v, 0, 999); if (/^[a-z]{3,20}$/.test(k) && n) o[k] = Math.round(n); } return Object.keys(o).length ? o : null; };
// The board shows only the region and country a player's connection comes from (never the city or the address), and
// nothing if they have hidden it
const placeOf = (request, hide) => { const cf = request.cf || {}; if (hide || !cf.country) return null; return { region: clip(cf.region, 40), country: clip(cf.country, 2) }; };
const row = p => {
  const games = parseJSON(p.games, []);
  return { id: p.id, name: p.name, ...(parseJSON(p.cur, {}) || {}), best: parseJSON(p.best), place: parseJSON(p.place), device: p.device, app: !!p.app, last: p.last, first: p.first, minutes: p.minutes, sessions: p.sessions, gamesPlayed: Math.max(1, games.length) };
};

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  if (!env.DB) return legacy.onRequestGet(ctx);
  await ensure(env);
  await sweep(env);
  // a player is on the public board once they have played a minute: a page opened by a robot never gets there
  const { results } = await env.DB.prepare(`SELECT * FROM players WHERE hidden = 0 AND best_worth IS NOT NULL AND minutes >= 1 ORDER BY best_worth DESC LIMIT 200`).all();
  const players = results.map(row);
  // the asking player, wherever they are on it
  const me = new URL(request.url).searchParams.get('id');
  if (me && !players.some(p => p.id === me)) { const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ? AND hidden = 0 AND best_worth IS NOT NULL`).bind(me).first(); if (p) players.push(row(p)); }
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM players WHERE hidden = 0 AND best_worth IS NOT NULL AND minutes >= 1`).first('n');
  return json({ players, total, now: Date.now() });
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  if (!env.DB) return legacy.onRequestPost(ctx);
  await ensure(env);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40), p = await playerFor(env, id, clip(r.key, 64), { claim: true, request });
  if (!p) return json({ error: 'not yours' }, 403);
  const pid = p.id; // (the player the key belongs to: another than id when the two were made one)
  const now = Date.now();
  // a new name for the board, if it is a decent one
  if (r.action === 'name') {
    const name = clip(r.name, 30);
    if (!nameOK(name)) return json({ ok: false, error: 'name', name: p.name });
    await env.DB.prepare(`UPDATE players SET name = ?, named = 1 WHERE id = ?`).bind(name, pid).run();
    return json({ ok: true, name });
  }
  // a game can take itself off the board, and come back
  if (r.remove || r.action === 'hide') { await env.DB.prepare(`UPDATE players SET hidden = 1 WHERE id = ?`).bind(pid).run(); return json({ ok: true, removed: true }); }
  const game = clip(r.game, 40), worth = num(r.worth, -1e9, 1e12);
  const cur = { game: game || null, company: clip(r.company, 60), year: num(r.year, 1870, 2100), month: clip(r.month, 12) || null, worth, title: clip(r.title, 40), boats: num(r.boats, 0, 999), fleet: cleanFleet(r.fleet) };
  let best = parseJSON(p.best);
  if (worth != null && (!best || worth > best.worth)) best = { worth, company: cur.company, year: cur.year, month: cur.month, title: cur.title, game: game || null, at: now };
  const games = parseJSON(p.games, []); if (game && !games.includes(game)) { games.push(game); if (games.length > 50) games.shift(); }
  // the name the game sends, if it's decent and the player hasn't one already; otherwise a settler's
  let name = p.name; const sent = clip(r.name, 30);
  if (!name || (!p.named && sent && sent !== name)) name = sent && nameOK(sent) ? sent : name || settlerName();
  await env.DB.prepare(`UPDATE players SET name = ?, last = ?, minutes = ?, sessions = ?, cur = ?, best = ?, best_worth = ?, games = ?, place = ?, hide_place = ?, device = ?, app = ?, hidden = 0 WHERE id = ?`).bind(
    name, now, Math.round(((p.minutes || 0) + (num(r.minutes, 0, 15) || 0)) * 10) / 10, (p.sessions || 0) + (r.start ? 1 : 0), JSON.stringify(cur), best ? JSON.stringify(best) : null, best ? best.worth : null,
    JSON.stringify(games), JSON.stringify(placeOf(request, !!r.hidePlace)), r.hidePlace ? 1 : 0, clip(r.device, 20), r.app ? 1 : 0, pid).run();
  return json({ ok: true, player: playerInfo({ ...p, name }) });
}
