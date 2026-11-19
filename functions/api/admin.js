// The owner's page (at /api/admin, used by admin.html): every player, and putting right a name or a player who shouldn't
// be on the board. Only the players named in the ADMIN_PLAYER setting (their ids, comma-separated) may use it, from a
// device signed in as them.
import { json, clip, ensure, playerFor, isAdmin, parseJSON, sweep } from '../../server/lib.js';
import { settlerName } from '../../server/names.js';

async function admin(env, id, key) { const p = await playerFor(env, id, key); return p && isAdmin(env, p.id) ? p : null; }

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'not set up' }, 503);
  await ensure(env);
  const q = new URL(request.url).searchParams;
  if (!(await admin(env, q.get('id') || '', q.get('key') || ''))) return json({ error: 'not allowed' }, 403);
  await sweep(env);
  const { results } = await env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM keys k WHERE k.player = p.id) AS devices, (SELECT COUNT(*) FROM passkeys k WHERE k.player = p.id) AS passkeys,
    (SELECT COUNT(*) FROM saves s WHERE s.player = p.id) AS saved FROM players p ORDER BY p.last DESC LIMIT 1000`).all();
  const players = results.map(p => ({ id: p.id, name: p.name, named: !!p.named, hidden: !!p.hidden, last: p.last, first: p.first, minutes: p.minutes, sessions: p.sessions,
    best: parseJSON(p.best), cur: parseJSON(p.cur), place: parseJSON(p.place), device: p.device, devices: p.devices, passkeys: p.passkeys, saved: p.saved, recovery: !!p.recovery,
    // the same test as PLAYED in server/lib.js: a minute of play, or a passkey or recovery code
    played: (p.minutes || 0) >= 1 || p.passkeys > 0 || !!p.recovery }));
  // the counts are of people who played; the visits that never got going are counted apart
  const day = Date.now() - 864e5, week = Date.now() - 7 * 864e5, played = players.filter(p => p.played);
  return json({ players, today: played.filter(p => p.last > day).length, week: played.filter(p => p.last > week).length, visits: players.length - played.length, now: Date.now() });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'not set up' }, 503);
  await ensure(env);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  if (!(await admin(env, clip(r.id, 40), clip(r.key, 64)))) return json({ error: 'not allowed' }, 403);
  const t = clip(r.target, 40);
  if (r.action === 'hide' || r.action === 'show') await env.DB.prepare(`UPDATE players SET hidden = ? WHERE id = ?`).bind(r.action === 'hide' ? 1 : 0, t).run();
  else if (r.action === 'rename') { const name = settlerName(); await env.DB.prepare(`UPDATE players SET name = ?, named = 1 WHERE id = ?`).bind(name, t).run(); return json({ ok: true, name }); } // the new name sticks: the player's game takes it up
  else if (r.action === 'remove') await env.DB.batch(['players WHERE id', 'keys WHERE player', 'passkeys WHERE player', 'saves WHERE player'].map(w => env.DB.prepare(`DELETE FROM ${w} = ?`).bind(t)));
  else return json({ error: 'unknown action' }, 400);
  return json({ ok: true });
}
