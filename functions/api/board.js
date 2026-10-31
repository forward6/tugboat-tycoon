// The scoreboard (Cloudflare Pages Function, at /api/board): each game reports who is playing it, how far they have got
// and how long they have played; anyone with the game can read the board. For each player it keeps the game they are
// playing now and their best game (the most any of their companies has been worth), so starting over never lowers
// their place. It is kept in Workers KV, bound to the Pages project as PLAYS, all in one record, since each game reports
// only when it starts and every few minutes.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };

export async function onRequestGet({ env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  const board = (await env.PLAYS.get('board', 'json')) || {};
  // the ids of a player's games stay here: the board needs only how many there have been
  const players = Object.values(board).map(({ games, ...p }) => ({ ...p, gamesPlayed: Array.isArray(games) ? games.length : 1 }));
  return json({ players, now: Date.now() });
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40); if (!/^[a-z0-9]{8,40}$/.test(id)) return json({ error: 'bad id' }, 400);
  const board = (await env.PLAYS.get('board', 'json')) || {};
  if (r.remove) { // a game can take itself off the board: only it knows its id
    if (board[id]) { delete board[id]; await env.PLAYS.put('board', JSON.stringify(board)); }
    return json({ ok: true, removed: true });
  }
  if (!board[id] && Object.keys(board).length >= 200) return json({ error: 'board full' }, 429);
  const now = Date.now(), p = board[id] || { id, first: now, minutes: 0, sessions: 0 };
  // a player from before best games were kept: the game on the board until now is their best so far
  if (!p.best && p.worth != null) p.best = { worth: p.worth, company: p.company, year: p.year, title: p.title, game: p.game || null, at: p.last || now };
  const game = clip(r.game, 40);
  Object.assign(p, {
    name: clip(r.name, 30) || p.name || '', game, company: clip(r.company, 60), year: num(r.year, 1870, 2100), worth: num(r.worth, -1e9, 1e12),
    title: clip(r.title, 40), boats: num(r.boats, 0, 999), device: clip(r.device, 20), app: !!r.app, last: now,
  });
  // the best game: the most any of the player's companies has been worth, and when it got there
  if (p.worth != null && (!p.best || p.worth > p.best.worth)) p.best = { worth: p.worth, company: p.company, year: p.year, title: p.title, game: game || null, at: now };
  // how many games: the last 50 game ids seen
  if (game) { p.games = Array.isArray(p.games) ? p.games : []; if (!p.games.includes(game)) { p.games.push(game); if (p.games.length > 50) p.games.shift(); } }
  p.minutes = Math.round((p.minutes + (num(r.minutes, 0, 15) || 0)) * 10) / 10;
  if (r.start) p.sessions = (p.sessions || 0) + 1;
  board[id] = p;
  await env.PLAYS.put('board', JSON.stringify(board));
  return json({ ok: true });
}
