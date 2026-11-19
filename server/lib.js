// Shared by the game's server functions (functions/api/*): the D1 database that holds the players, their devices, their
// passkeys and their online saves; the import of what was kept in Workers KV before it; and small helpers.
//
// A player is one row in `players`, keyed by the id the game made for them. Each device they play on holds a key of its
// own (a random string the server keeps only a hash of, in `keys`), so a request from that device is known to be theirs.
// A new device gets a key of its own by signing in with a passkey or the player's recovery code.

export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
export const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
export const ID = /^[a-z0-9]{8,40}$/, KEY = /^[a-z0-9]{16,64}$/, GAME = /^[a-z0-9]{4,40}$/;
const enc = new TextEncoder();
export const sha256 = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s));
export const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
// a device key's hash, the same as the online saves used before, so their locks carry over
export const keyHash = async key => hex(await sha256('tugboat-save:' + key));
export const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = s => { const t = String(s).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(t + '='.repeat((4 - t.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
export const randomId = (n = 16) => b64u(crypto.getRandomValues(new Uint8Array(n)));
export const parseJSON = (s, d = null) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };

// ---- the database: its tables, made the first time it is used ----
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', named INTEGER DEFAULT 0, first INTEGER, last INTEGER,
    minutes REAL DEFAULT 0, sessions INTEGER DEFAULT 0, cur TEXT, best TEXT, best_worth REAL, games TEXT, place TEXT, hide_place INTEGER DEFAULT 0,
    device TEXT, app INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, recovery TEXT, created INTEGER)`,
  `CREATE INDEX IF NOT EXISTS players_best ON players (hidden, best_worth DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS players_recovery ON players (recovery)`,
  `CREATE TABLE IF NOT EXISTS keys (hash TEXT PRIMARY KEY, player TEXT NOT NULL, created INTEGER, last INTEGER, device TEXT)`,
  `CREATE INDEX IF NOT EXISTS keys_player ON keys (player)`,
  `CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, player TEXT NOT NULL, pub TEXT NOT NULL, alg INTEGER, counter INTEGER DEFAULT 0, created INTEGER, last INTEGER, device TEXT)`,
  `CREATE INDEX IF NOT EXISTS passkeys_player ON passkeys (player)`,
  `CREATE TABLE IF NOT EXISTS saves (player TEXT NOT NULL, game TEXT NOT NULL, at INTEGER, mon TEXT, year INTEGER, company TEXT, worth REAL, data TEXT, PRIMARY KEY (player, game))`,
  `CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, challenge TEXT, player TEXT, kind TEXT, created INTEGER)`,
  `CREATE TABLE IF NOT EXISTS moves (code TEXT PRIMARY KEY, player TEXT, key TEXT, created INTEGER)`,
  `CREATE TABLE IF NOT EXISTS tries (what TEXT, ip TEXT, at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS tries_ip ON tries (what, ip, at)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`,
];
let ready = null;
export function ensure(env) {
  if (!ready) ready = (async () => {
    await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s)));
    await importKV(env);
  })().catch(e => { ready = null; throw e; });
  return ready;
}

// ---- the first time, the scoreboard and online saves kept in Workers KV (PLAYS) come across ----
async function importKV(env) {
  if (!env.PLAYS) return;
  const done = await env.DB.prepare(`SELECT v FROM meta WHERE k = 'kv-import'`).first('v');
  if (done) return;
  const now = Date.now(), stmts = [];
  const board = (await env.PLAYS.get('board', 'json')) || {};
  for (const p of Object.values(board)) {
    if (!p || !ID.test(p.id || '')) continue;
    const cur = { game: p.game || null, company: p.company || '', year: p.year ?? null, month: p.month || null, worth: p.worth ?? null, title: p.title || '', boats: p.boats ?? null, fleet: p.fleet || null };
    const best = p.best || (p.worth != null ? { worth: p.worth, company: p.company, year: p.year, month: p.month || null, title: p.title, game: p.game || null, at: p.last || now } : null);
    // the board kept the city: the public board now shows only the region and country
    const place = p.place ? { region: p.place.region || '', country: p.place.country || '' } : null;
    stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO players (id, name, named, first, last, minutes, sessions, cur, best, best_worth, games, place, hide_place, device, app, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(p.id, clip(p.name, 30), p.name ? 1 : 0, p.first || now, p.last || now, p.minutes || 0, p.sessions || 0,
      JSON.stringify(cur), best ? JSON.stringify(best) : null, best ? best.worth : null, JSON.stringify(Array.isArray(p.games) ? p.games : []), place ? JSON.stringify(place) : null, 0, clip(p.device, 20), p.app ? 1 : 0, now));
  }
  let cursor;
  do {
    const page = await env.PLAYS.list({ prefix: 'save:', cursor }); cursor = page.list_complete ? null : page.cursor;
    for (const k of page.keys) {
      const id = k.name.slice(5); if (!ID.test(id)) continue;
      const rec = await env.PLAYS.get(k.name, 'json'); if (!rec) continue;
      // a device's save lock becomes its key: the same hash
      if (rec.keyHash) stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO keys (hash, player, created, last) VALUES (?, ?, ?, ?)`).bind(rec.keyHash, id, now, now));
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO players (id, name, first, last, created) VALUES (?, '', ?, ?, ?)`).bind(id, now, now, now));
      for (const [game, g] of Object.entries(rec.games || {})) if (GAME.test(game) && g && g.data)
        stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO saves (player, game, at, mon, year, company, worth, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, game, g.at || now, clip(g.when, 20), g.year ?? null, clip(g.company, 60), g.worth ?? null, g.data));
    }
  } while (cursor);
  stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES ('kv-import', ?)`).bind(String(now)));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}

// ---- who is asking: a player's id and one of their device keys ----
// Returns the player's row, or null. With `claim`, a key the server has never seen may become the player's: a brand new
// player (made here), or one from before device keys whose own devices haven't claimed it yet.
export async function playerFor(env, id, key, { claim = false, request = null } = {}) {
  if (!ID.test(id || '') || !KEY.test(key || '')) return null;
  const h = await keyHash(key), now = Date.now();
  const k = await env.DB.prepare(`SELECT player FROM keys WHERE hash = ?`).bind(h).first();
  if (k) {
    if (k.player !== id) return null;
    await env.DB.prepare(`UPDATE keys SET last = ? WHERE hash = ?`).bind(now, h).run();
    return env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(id).first();
  }
  if (!claim) return null;
  const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(id).first();
  if (p) {
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM keys WHERE player = ?`).bind(id).first('n');
    if (n) return null; // a player whose devices hold keys: a new key comes only through signing in
    await env.DB.prepare(`INSERT OR IGNORE INTO keys (hash, player, created, last) VALUES (?, ?, ?, ?)`).bind(h, id, now, now).run();
    return (await keyOwner(env, h)) === id ? p : null;
  }
  // a new player: a few a day from any one connection, to keep the board from being flooded
  if (request && !(await allow(env, 'new', request, 30, 864e5))) return null;
  // (a device's first report and its first online save can arrive together: whichever comes second finds the player made)
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO players (id, name, first, last, created) VALUES (?, '', ?, ?, ?)`).bind(id, now, now, now),
    env.DB.prepare(`INSERT OR IGNORE INTO keys (hash, player, created, last) VALUES (?, ?, ?, ?)`).bind(h, id, now, now),
  ]);
  if ((await keyOwner(env, h)) !== id) return null;
  return env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(id).first();
}
const keyOwner = (env, h) => env.DB.prepare(`SELECT player FROM keys WHERE hash = ?`).bind(h).first('player');
// Who has played: a minute of play, or a passkey or recovery code. The rest are visits that never got going (since
// November 2026 the game sends nothing until a first decision, but visits from before are kept until the sweep).
export const PLAYED = `(minutes >= 1 OR recovery IS NOT NULL OR id IN (SELECT player FROM passkeys))`;
// Once an hour or so, visits that never played are cleared away after a week, with their keys and online saves
let swept = 0;
export async function sweep(env) {
  const now = Date.now(); if (now - swept < 3600e3) return; swept = now;
  const idle = `SELECT id FROM players WHERE NOT ${PLAYED} AND last < ${now - 7 * 864e5}`;
  await env.DB.batch(['saves WHERE player', 'keys WHERE player', 'players WHERE id'].map(w => env.DB.prepare(`DELETE FROM ${w} IN (${idle})`)));
}
// Give a device a new key for a player (after signing in)
export async function addKey(env, player, key, device) {
  if (!KEY.test(key || '')) return false;
  const now = Date.now();
  await env.DB.prepare(`INSERT OR REPLACE INTO keys (hash, player, created, last, device) VALUES (?, ?, ?, ?, ?)`).bind(await keyHash(key), player, now, now, clip(device, 20)).run();
  return true;
}
// At most n tries of something in a period, from any one connection
export async function allow(env, what, request, n, ms) {
  const ip = request.headers.get('cf-connecting-ip') || 'local', now = Date.now();
  await env.DB.prepare(`DELETE FROM tries WHERE at < ?`).bind(now - 7 * 864e5).run();
  const c = await env.DB.prepare(`SELECT COUNT(*) AS n FROM tries WHERE what = ? AND ip = ? AND at > ?`).bind(what, ip, now - ms).first('n');
  if (c >= n) return false;
  await env.DB.prepare(`INSERT INTO tries (what, ip, at) VALUES (?, ?, ?)`).bind(what, ip, now).run();
  return true;
}
export const isAdmin = (env, id) => !!id && String(env.ADMIN_PLAYER || '').split(',').map(s => s.trim()).filter(Boolean).includes(id);
// What the game needs to know about its own player
// (safe: the player has a passkey and a recovery code, so their games can come back if a device is lost)
export const playerInfo = p => ({ id: p.id, name: p.name, named: !!p.named, hidePlace: !!p.hide_place, safe: !!p.recovery });
