// Signing in (at /api/auth): passkeys and recovery codes. Play needs no account. A player who wants their games on all
// their devices, safe if one is lost, makes a passkey (the iPad's or phone's Face ID or Touch ID, or a computer's) and is
// given a recovery code to write down. On another device, the passkey or the code brings the same player back, and that
// device gets a key of its own. The server keeps no email, password or name beyond the one on the board.
import { json, clip, ensure, playerFor, addKey, allow, isAdmin, playerInfo, randomId, b64u, sha256, hex, keyHash } from '../../server/lib.js';
import { verifyRegistration, verifyAssertion } from '../../server/webauthn.js';
import { nameOK } from '../../server/names.js';

const WORDS = ['ANCHOR', 'BALSAM', 'BARGE', 'BEACON', 'BIRCH', 'BOOM', 'BOW', 'BRASS', 'BUOY', 'CABIN', 'CANOE', 'CAPE', 'CEDAR', 'CHART', 'CLEAT', 'COAL', 'COVE', 'CRANE', 'CREEK', 'DECK',
  'DOCK', 'DRIFT', 'EAGLE', 'EBB', 'FERN', 'FERRY', 'FISH', 'FLAG', 'FOG', 'GALE', 'GULL', 'HARBOUR', 'HATCH', 'HAWSER', 'HELM', 'HERON', 'HULL', 'INLET', 'ISLAND', 'JETTY', 'KEEL', 'KNOT',
  'LAKE', 'LAMP', 'LARCH', 'LIGHT', 'LOG', 'LOON', 'MAPLE', 'MAST', 'MILL', 'MINK', 'MOOSE', 'OAK', 'OAR', 'OTTER', 'PADDLE', 'PIER', 'PIKE', 'PINE', 'PORT', 'QUAY', 'RAFT', 'REEF', 'RIVER',
  'ROPE', 'RUDDER', 'SAIL', 'SALMON', 'SAND', 'SHOAL', 'SHORE', 'SKIFF', 'SMELT', 'SOUND', 'SPRUCE', 'STACK', 'STEAM', 'STERN', 'STONE', 'SWELL', 'TACK', 'TIDE', 'TIMBER', 'TOW', 'TROUT', 'TUG',
  'WAKE', 'WAVE', 'WHARF', 'WHISTLE', 'WILLOW', 'WIND', 'WINCH', 'YAWL', 'BAY', 'BEAVER', 'BLUFF', 'CARGO', 'CREW', 'DUNE', 'FATHOM', 'GRANITE', 'HAVEN', 'LOCK', 'MARSH', 'NORTH', 'ORE',
  'PILOT', 'POINT', 'RAPIDS', 'ROCK', 'SPAR', 'STORM', 'SUMMER', 'THAW', 'VALVE', 'WALLEYE', 'WINTER', 'ASPEN', 'BOILER', 'CHANNEL', 'DORY', 'FUNNEL', 'GUNWALE'];
const newCode = () => { const r = crypto.getRandomValues(new Uint16Array(5)); return [...[0, 1, 2, 3].map(i => WORDS[r[i] % WORDS.length]), String(1000 + r[4] % 9000)].join('-'); };
const codeHash = async code => hex(await sha256('tugboat-code:' + String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')));
const site = request => { const u = new URL(request.url); return { origin: u.origin, rpId: u.hostname }; };

async function challenge(env, kind, player) {
  const id = randomId(12), c = randomId(32), now = Date.now();
  await env.DB.batch([env.DB.prepare(`DELETE FROM challenges WHERE created < ?`).bind(now - 10 * 60000), env.DB.prepare(`INSERT INTO challenges (id, challenge, player, kind, created) VALUES (?, ?, ?, ?, ?)`).bind(id, c, player || null, kind, now)]);
  return { id, c };
}
async function takeChallenge(env, id, kind) {
  const ch = await env.DB.prepare(`SELECT * FROM challenges WHERE id = ? AND kind = ?`).bind(clip(id, 40), kind).first();
  if (ch) await env.DB.prepare(`DELETE FROM challenges WHERE id = ?`).bind(ch.id).run();
  return ch && Date.now() - ch.created < 10 * 60000 ? ch : null;
}
async function giveCode(env, player) { const code = newCode(); await env.DB.prepare(`UPDATE players SET recovery = ? WHERE id = ?`).bind(await codeHash(code), player).run(); return code; }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'not set up' }, 503);
  await ensure(env);
  let r; try { r = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
  const id = clip(r.id, 40), key = clip(r.key, 64), { origin, rpId } = site(request), a = r.action;
  try {
    // ---- what this device's player has: for Settings ----
    if (a === 'status') {
      const p = await playerFor(env, id, key); if (!p) return json({ ok: true, known: false });
      const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM passkeys WHERE player = ?`).bind(p.id).first('n');
      return json({ ok: true, known: true, passkeys: n, recovery: !!p.recovery, admin: isAdmin(env, p.id), player: playerInfo(p) });
    }
    // ---- making a passkey for the player on this device ----
    if (a === 'register-begin') {
      const p = await playerFor(env, id, key, { claim: true, request }); if (!p) return json({ error: 'not yours' }, 403);
      // a player the board hasn't heard from yet takes this device's name, so the devices that sign in later take it too
      const sent = clip(r.name, 30);
      if (!p.name && sent && nameOK(sent)) { await env.DB.prepare(`UPDATE players SET name = ? WHERE id = ? AND name = ''`).bind(sent, p.id).run(); p.name = sent; }
      const { results } = await env.DB.prepare(`SELECT id FROM passkeys WHERE player = ?`).bind(p.id).all();
      const ch = await challenge(env, 'reg', p.id), name = p.name || 'Tugboat Tycoon player';
      return json({ ok: true, challengeId: ch.id, publicKey: {
        challenge: ch.c, rp: { id: rpId, name: 'Tugboat Tycoon' }, user: { id: b64u(new TextEncoder().encode(p.id)), name, displayName: name },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], timeout: 120000, attestation: 'none',
        authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
        excludeCredentials: results.map(x => ({ type: 'public-key', id: x.id })) } });
    }
    if (a === 'register-finish') {
      const p = await playerFor(env, id, key); if (!p) return json({ error: 'not yours' }, 403);
      const ch = await takeChallenge(env, r.challengeId, 'reg'); if (!ch || ch.player !== p.id) return json({ error: 'expired' }, 400);
      const pk = await verifyRegistration({ credential: r.credential, challenge: ch.challenge, origin, rpId });
      const now = Date.now();
      await env.DB.prepare(`INSERT INTO passkeys (id, player, pub, alg, counter, created, last, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(pk.id, p.id, pk.pub, pk.alg, pk.counter, now, now, clip(r.device, 20)).run();
      // the first passkey comes with a recovery code, shown once
      const code = p.recovery ? null : await giveCode(env, p.id);
      return json({ ok: true, recovery: code });
    }
    // ---- signing in on a device with a passkey ----
    if (a === 'login-begin') {
      if (!(await allow(env, 'login', request, 60, 3600e3))) return json({ error: 'too many' }, 429);
      const ch = await challenge(env, 'login', null);
      return json({ ok: true, challengeId: ch.id, publicKey: { challenge: ch.c, rpId, timeout: 120000, userVerification: 'preferred', allowCredentials: [] } });
    }
    if (a === 'login-finish') {
      const ch = await takeChallenge(env, r.challengeId, 'login'); if (!ch) return json({ error: 'expired' }, 400);
      const credId = clip(r.credential && r.credential.id, 400);
      const stored = await env.DB.prepare(`SELECT * FROM passkeys WHERE id = ?`).bind(credId).first();
      if (!stored) return json({ error: 'unknown passkey' }, 404);
      const v = await verifyAssertion({ credential: r.credential, challenge: ch.challenge, origin, rpId, stored });
      await env.DB.prepare(`UPDATE passkeys SET counter = ?, last = ? WHERE id = ?`).bind(v.counter, Date.now(), credId).run();
      if (!(await addKey(env, stored.player, key, r.device))) return json({ error: 'bad key' }, 400);
      const p = await env.DB.prepare(`SELECT * FROM players WHERE id = ?`).bind(stored.player).first();
      return json({ ok: true, player: playerInfo(p) });
    }
    // ---- signing in with the recovery code ----
    if (a === 'recover') {
      if (!(await allow(env, 'recover', request, 10, 3600e3))) return json({ error: 'too many' }, 429);
      const p = await env.DB.prepare(`SELECT * FROM players WHERE recovery = ?`).bind(await codeHash(r.code)).first();
      if (!p) return json({ ok: false, error: 'wrong code' });
      if (!(await addKey(env, p.id, key, r.device))) return json({ error: 'bad key' }, 400);
      return json({ ok: true, player: playerInfo(p) });
    }
    // ---- a new recovery code (the old one stops working) ----
    if (a === 'new-code') {
      const p = await playerFor(env, id, key); if (!p) return json({ error: 'not yours' }, 403);
      return json({ ok: true, recovery: await giveCode(env, p.id) });
    }
    // ---- this device forgets the player ----
    if (a === 'signout') {
      const p = await playerFor(env, id, key); if (!p) return json({ ok: true });
      await env.DB.prepare(`DELETE FROM keys WHERE hash = ?`).bind(await keyHash(key)).run();
      return json({ ok: true });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 400);
  }
}
