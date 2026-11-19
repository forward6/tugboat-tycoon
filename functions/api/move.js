// Moving to the new address (at /api/move). The browser keeps each player's games and identity under the address the game
// was played at, so on tugboat-tycoon.pages.dev a player taps "Move my games": their games go up as online saves, and the
// game asks here for a one-time code, good for an hour. On tugboattycoon.com the code makes the new browser that same
// player, with a device key of its own, and the games come down.
import { json, clip, ensure, playerFor, addKey, playerInfo, randomId } from '../../server/lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'not set up' }, 503);
  await ensure(env);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const now = Date.now();
  await env.DB.prepare(`DELETE FROM moves WHERE created < ?`).bind(now - 3600e3).run();
  if (r.action === 'claim') {
    const m = await env.DB.prepare(`SELECT * FROM moves WHERE code = ?`).bind(clip(r.code, 60)).first();
    if (!m) return json({ ok: false, error: 'expired' });
    await env.DB.prepare(`DELETE FROM moves WHERE code = ?`).bind(m.code).run();
    if (!(await addKey(env, m.player, clip(r.key, 64), r.device))) return json({ error: 'bad key' }, 400);
    const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(m.player).first();
    return p ? json({ ok: true, player: playerInfo(p) }) : json({ ok: false, error: 'gone' });
  }
  const p = await playerFor(env, clip(r.id, 40), clip(r.key, 64), { claim: true, request });
  if (!p) return json({ error: 'not yours' }, 403);
  const code = randomId(18);
  await env.DB.prepare(`INSERT INTO moves (code, player, created) VALUES (?, ?, ?)`).bind(code, p.id, now).run();
  return json({ ok: true, code });
}
