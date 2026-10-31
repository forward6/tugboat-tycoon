// The family scoreboard (Cloudflare Pages Function, at /api/board): each game reports who is playing it, how far they
// have got and how long they have played; anyone with the game can read the board. It is kept in Workers KV, bound to
// the Pages project as PLAYS, all in one record, since each game reports only every few minutes.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };

export async function onRequestGet({ env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  const board = (await env.PLAYS.get('board', 'json')) || {};
  return json({ players: Object.values(board), now: Date.now() });
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'not set up' }, 503);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40); if (!/^[a-z0-9]{8,40}$/.test(id)) return json({ error: 'bad id' }, 400);
  const board = (await env.PLAYS.get('board', 'json')) || {};
  if (!board[id] && Object.keys(board).length >= 200) return json({ error: 'board full' }, 429);
  const now = Date.now(), p = board[id] || { id, first: now, minutes: 0, sessions: 0 };
  Object.assign(p, {
    name: clip(r.name, 30) || p.name || '', company: clip(r.company, 60), year: num(r.year, 1870, 2100), worth: num(r.worth, -1e9, 1e12),
    title: clip(r.title, 40), boats: num(r.boats, 0, 999), device: clip(r.device, 20), app: !!r.app, last: now,
  });
  p.minutes = Math.round((p.minutes + (num(r.minutes, 0, 15) || 0)) * 10) / 10;
  if (r.start) p.sessions = (p.sessions || 0) + 1;
  board[id] = p;
  await env.PLAYS.put('board', JSON.stringify(board));
  return json({ ok: true });
}
