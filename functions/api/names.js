// The company names in use, so that a new game starts with a name no one else has: every saved game's company and every
// player's current and best game on the board. Only a short hash of each name goes out (nameKey, which the game also
// uses), never the names. ?game= leaves out the asking game itself.
import { json, ensure, parseJSON } from '../../server/lib.js';
import { nameKey } from '../../server/names.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ taken: [] });
  await ensure(env);
  const game = new URL(request.url).searchParams.get('game') || '';
  const keys = new Set();
  const { results: saves } = await env.DB.prepare(`SELECT DISTINCT company FROM saves WHERE company IS NOT NULL AND company != '' AND game != ?`).bind(game).all();
  for (const r of saves) keys.add(nameKey(r.company));
  const { results: players } = await env.DB.prepare(`SELECT cur, best FROM players`).all();
  for (const p of players) for (const g of [parseJSON(p.cur), parseJSON(p.best)]) if (g && g.company && (!game || g.game !== game)) keys.add(nameKey(g.company));
  return json({ taken: [...keys] });
}
