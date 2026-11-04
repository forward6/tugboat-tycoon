// Games saved online (Cloudflare Pages Function, at /api/save), so a device that loses a game can bring it back. Each
// device (the scoreboard's id) keeps its last three games, each as it was last sent, in one Workers KV record,
// `save:<id>`, in the same PLAYS namespace as the board. The record is locked to the device: the first save sets a key
// that only that device holds (the server keeps a hash of it), and every later save or read must give the same key, so
// nobody can read or overwrite another player's games from the ids on the public board.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
const ID = /^[a-z0-9]{8,40}$/, GAME = /^[a-z0-9]{4,40}$/, KEY = /^[a-z0-9]{16,64}$/, KEEP = 3, MAX = 400000;
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tugboat-save:' + s)))].map(b => b.toString(16).padStart(2, '0')).join('');

export async function onRequestGet({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  const q = new URL(request.url).searchParams, id = q.get('id') || '', key = q.get('key') || '';
  if (!ID.test(id) || !KEY.test(key)) return json({ error: 'bad id' }, 400);
  const rec = (await env.PLAYS.get('save:' + id, 'json')) || { games: {} };
  // a record from before the lock opens only once its own device has saved to it again, with its key
  if (!rec.keyHash || rec.keyHash !== await hash(key)) return json({ id, games: [], now: Date.now() });
  const games = Object.entries(rec.games || {}).map(([game, g]) => ({ game, ...g })).sort((a, b) => b.at - a.at);
  return json({ id, games, now: Date.now() });
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  if (Number(request.headers.get('content-length') || 0) > MAX) return json({ error: 'too big' }, 413);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40), game = clip(r.game, 40), key = clip(r.key, 64);
  if (!ID.test(id) || !GAME.test(game) || !KEY.test(key)) return json({ error: 'bad id' }, 400);
  const data = typeof r.data === 'string' ? r.data : '';
  if (!data || data.length > MAX) return json({ error: 'no game' }, 400);
  let g; try { g = JSON.parse(data); } catch (e) { return json({ error: 'not a game' }, 400); }
  if (!g || g.v !== 1 || !Array.isArray(g.tugs) || !g.year) return json({ error: 'not a game' }, 400);
  const kv = 'save:' + id, rec = (await env.PLAYS.get(kv, 'json')) || { games: {} }, h = await hash(key);
  if (rec.keyHash && rec.keyHash !== h) return json({ error: 'not yours' }, 403);
  // the first save with a key, from the device itself, locks the record to it, games and all
  if (!rec.keyHash) rec.keyHash = h;
  rec.games = rec.games || {};
  rec.games[game] = { at: Date.now(), when: clip(r.when, 20), year: num(r.year, 1870, 2100), company: clip(r.company, 60), worth: num(r.worth, -1e9, 1e12), data };
  for (const k of Object.keys(rec.games).sort((a, b) => rec.games[b].at - rec.games[a].at).slice(KEEP)) delete rec.games[k];
  await env.PLAYS.put(kv, JSON.stringify(rec));
  return json({ ok: true });
}
