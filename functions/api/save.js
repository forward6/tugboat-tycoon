// Games saved online (at /api/save), so a player who loses a game, or plays on another device, can bring it back. Each
// player keeps their last six games, each as it was last sent, in the D1 database (DB). Reading or saving needs one of
// the player's device keys, so no one can read or overwrite another player's games from the ids on the public board.
import { json, clip, num, ensure, playerFor, GAME } from '../../server/lib.js';
import * as legacy from '../../server/legacy-save.js';
const KEEP = 6, MAX = 400000;

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  if (!env.DB) return legacy.onRequestGet(ctx);
  await ensure(env);
  const q = new URL(request.url).searchParams, id = q.get('id') || '';
  const p = await playerFor(env, id, q.get('key') || '');
  if (!p) return json({ id, games: [], now: Date.now() });
  const { results } = await env.DB.prepare(`SELECT game, at, mon AS "when", year, company, worth, data FROM saves WHERE player = ? ORDER BY at DESC`).bind(id).all();
  return json({ id, games: results, now: Date.now() });
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  if (!env.DB) return legacy.onRequestPost(ctx);
  await ensure(env);
  if (Number(request.headers.get('content-length') || 0) > MAX) return json({ error: 'too big' }, 413);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40), game = clip(r.game, 40);
  if (!GAME.test(game)) return json({ error: 'bad id' }, 400);
  const data = typeof r.data === 'string' ? r.data : '';
  if (!data || data.length > MAX) return json({ error: 'no game' }, 400);
  let g; try { g = JSON.parse(data); } catch (e) { return json({ error: 'not a game' }, 400); }
  if (!g || g.v !== 1 || !Array.isArray(g.tugs) || !g.year) return json({ error: 'not a game' }, 400);
  const p = await playerFor(env, id, clip(r.key, 64), { claim: true, request });
  if (!p) return json({ error: 'not yours' }, 403);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO saves (player, game, at, mon, year, company, worth, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, game, Date.now(), clip(r.when, 20), num(r.year, 1870, 2100), clip(r.company, 60), num(r.worth, -1e9, 1e12), data),
    env.DB.prepare(`DELETE FROM saves WHERE player = ? AND game NOT IN (SELECT game FROM saves WHERE player = ? ORDER BY at DESC LIMIT ${KEEP})`).bind(id, id),
  ]);
  return json({ ok: true });
}
