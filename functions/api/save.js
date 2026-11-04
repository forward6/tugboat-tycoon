// Games saved online (Cloudflare Pages Function, at /api/save), so a game survives the iPad clearing its storage, a
// home-screen icon being deleted, or a move to another device. Each player (the scoreboard's id) keeps their last three
// games, each as it was last sent, in one Workers KV record, `save:<id>`, in the same PLAYS namespace as the board.
// Anyone with the game can read a save by the player's id: to bring a game back, a player picks their own name off the
// scoreboard. It is a family game; nothing here is secret.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
const ID = /^[a-z0-9]{8,40}$/, GAME = /^[a-z0-9]{4,40}$/, KEEP = 3, MAX = 400000;

export async function onRequestGet({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!ID.test(id)) return json({ error: 'bad id' }, 400);
  const rec = (await env.PLAYS.get('save:' + id, 'json')) || { games: {} };
  const games = Object.entries(rec.games || {}).map(([game, g]) => ({ game, ...g })).sort((a, b) => b.at - a.at);
  return json({ id, games, now: Date.now() });
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  if (Number(request.headers.get('content-length') || 0) > MAX) return json({ error: 'too big' }, 413);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40), game = clip(r.game, 40);
  if (!ID.test(id) || !GAME.test(game)) return json({ error: 'bad id' }, 400);
  const data = typeof r.data === 'string' ? r.data : '';
  if (!data || data.length > MAX) return json({ error: 'no game' }, 400);
  let g; try { g = JSON.parse(data); } catch (e) { return json({ error: 'not a game' }, 400); }
  if (!g || g.v !== 1 || !Array.isArray(g.tugs) || !g.year) return json({ error: 'not a game' }, 400);
  const key = 'save:' + id, rec = (await env.PLAYS.get(key, 'json')) || { games: {} };
  rec.games = rec.games || {};
  rec.games[game] = { at: Date.now(), when: clip(r.when, 20), year: num(r.year, 1870, 2100), company: clip(r.company, 60), worth: num(r.worth, -1e9, 1e12), data };
  for (const k of Object.keys(rec.games).sort((a, b) => rec.games[b].at - rec.games[a].at).slice(KEEP)) delete rec.games[k];
  await env.PLAYS.put(key, JSON.stringify(rec));
  return json({ ok: true });
}
