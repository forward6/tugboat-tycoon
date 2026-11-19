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
  // players made one: a device that still holds the old id (and a key now the other player's) is pointed to the other
  `CREATE TABLE IF NOT EXISTS merges (old TEXT PRIMARY KEY, target TEXT NOT NULL, at INTEGER)`,
  // games the owner has taken away from a player: not taken again if a device sends them, and the devices drop them
  `CREATE TABLE IF NOT EXISTS drops (player TEXT NOT NULL, game TEXT NOT NULL, at INTEGER, PRIMARY KEY (player, game))`,
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
    // a device still using the id of a player since made one with another: it is that other player now (from: its old id,
    // so the game on the device takes the new one)
    const from = k.player !== id ? id : null;
    if (from && (await mergedInto(env, id)) !== k.player) return null;
    await env.DB.prepare(`UPDATE keys SET last = ? WHERE hash = ?`).bind(now, h).run();
    const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(k.player).first();
    return p && from ? { ...p, from } : p;
  }
  if (!claim) return null;
  if (await mergedInto(env, id)) return null; // an id made one with another player isn't made again
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
const mergedInto = (env, id) => env.DB.prepare(`SELECT target FROM merges WHERE old = ?`).bind(id).first('target');
// How far on a saved game is: its day
export const dayOf = data => { try { return Number(JSON.parse(data).day) || 0; } catch (e) { return 0; } };

// Two players made one (a person who played as two: on two devices, or at both addresses). The one with a passkey or a
// recovery code is kept, or else the one who has played longer; the other's devices, passkeys and games become the kept
// one's, with the better best game and both players' time. Where both have the same game, the copy further on keeps
// its place and the other is kept beside it, so nothing is lost. Returns the kept player.
export async function mergePlayers(env, x, y) {
  const get = id => env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM passkeys k WHERE k.player = p.id) AS pk FROM players p WHERE p.id = ?`).bind(id).first();
  const A = await get(x), B = await get(y);
  if (!A || !B || A.id === B.id) return A || B;
  const safe = p => (p.pk || p.recovery) ? 1 : 0;
  const [keep, gone] = (safe(A) - safe(B) || (A.minutes || 0) - (B.minutes || 0)) >= 0 ? [A, B] : [B, A];
  const saves = async id => (await env.DB.prepare(`SELECT game, data FROM saves WHERE player = ?`).bind(id).all()).results;
  const mine = new Map((await saves(keep.id)).map(s => [s.game, dayOf(s.data)])), stmts = [];
  for (const s of await saves(gone.id)) {
    let game = s.game;
    if (mine.has(game)) {
      const theirs = dayOf(s.data), branch = (g, who) => (g + 'x' + who.slice(0, 4)).slice(0, 40);
      if (theirs > mine.get(game)) stmts.push(env.DB.prepare(`UPDATE saves SET game = ? WHERE player = ? AND game = ?`).bind(branch(game, keep.id), keep.id, game));
      else game = branch(game, gone.id);
    }
    stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO saves (player, game, at, mon, year, company, worth, data) SELECT ?, ?, at, mon, year, company, worth, data FROM saves WHERE player = ? AND game = ?`).bind(keep.id, game, gone.id, s.game));
  }
  const better = (gone.best_worth || 0) > (keep.best_worth || 0);
  const games = JSON.stringify([...new Set([...parseJSON(keep.games, []), ...parseJSON(gone.games, [])])].slice(-40));
  stmts.push(
    env.DB.prepare(`DELETE FROM saves WHERE player = ?`).bind(gone.id),
    env.DB.prepare(`UPDATE keys SET player = ? WHERE player = ?`).bind(keep.id, gone.id),
    env.DB.prepare(`UPDATE passkeys SET player = ? WHERE player = ?`).bind(keep.id, gone.id),
    env.DB.prepare(`DELETE FROM players WHERE id = ?`).bind(gone.id),
    env.DB.prepare(`UPDATE players SET minutes = ?, sessions = ?, first = ?, last = ?, games = ?, best = ?, best_worth = ?, recovery = COALESCE(recovery, ?) WHERE id = ?`).bind(
      Math.round(((keep.minutes || 0) + (gone.minutes || 0)) * 10) / 10, (keep.sessions || 0) + (gone.sessions || 0), Math.min(keep.first || Date.now(), gone.first || Date.now()),
      Math.max(keep.last || 0, gone.last || 0), games, better ? gone.best : keep.best, better ? gone.best_worth : keep.best_worth, gone.recovery, keep.id),
    env.DB.prepare(`UPDATE merges SET target = ? WHERE target = ?`).bind(keep.id, gone.id),
    env.DB.prepare(`INSERT OR REPLACE INTO merges (old, target, at) VALUES (?, ?, ?)`).bind(gone.id, keep.id, Date.now()),
  );
  await env.DB.batch(stmts);
  return env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(keep.id).first();
}
// The owner takes a game away from a player (one they started by mistake, say): gone from the online saves, never taken
// again, and dropped by their devices the next time the game opens (the game in play there becomes their last other game).
// If it was the game the board shows them playing, the board shows their last other game instead.
export async function dropGame(env, player, game) {
  const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(player).first(); if (!p) return false;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM saves WHERE player = ? AND game = ?`).bind(player, game),
    env.DB.prepare(`INSERT OR REPLACE INTO drops (player, game, at) VALUES (?, ?, ?)`).bind(player, game, Date.now()),
  ]);
  const cur = parseJSON(p.cur, {}) || {};
  if (cur.game === game) {
    const s = await env.DB.prepare(`SELECT game, mon, year, company, worth, data FROM saves WHERE player = ? ORDER BY at DESC LIMIT 1`).bind(player).first();
    const best = parseJSON(p.best, {}) || {}, S = s ? parseJSON(s.data, {}) || {} : null;
    const mine = S ? (S.tugs || []).filter(t => t.owner === 'p') : [];
    const next = s ? { game: S.gameId || s.game, company: s.company, year: s.year, month: s.mon, worth: s.worth, title: best.game === (S.gameId || s.game) ? best.title || '' : '',
      boats: mine.length, fleet: mine.reduce((a, t) => (a[t.model] = (a[t.model] || 0) + 1, a), {}) } : null;
    await env.DB.prepare(`UPDATE players SET cur = ? WHERE id = ?`).bind(next ? JSON.stringify(next) : null, player).run();
  }
  return true;
}
export const droppedGames = async (env, player) => (await env.DB.prepare(`SELECT game FROM drops WHERE player = ?`).bind(player).all()).results.map(r => r.game);
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
export const playerInfo = p => ({ id: p.id, name: p.name, named: !!p.named, hidePlace: !!p.hide_place, safe: !!p.recovery, ...(p.from ? { from: p.from } : {}) });
