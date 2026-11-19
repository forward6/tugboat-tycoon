// Passkeys (WebAuthn) on the server, with no libraries: reading what the browser sends when a passkey is made and when it
// is used, and checking it. A passkey belongs to this site's address (its "relying party"), so one made on
// tugboattycoon.com works only there. We ask for no attestation (who made the authenticator), only the public key.
import { sha256, b64u, unb64u } from './lib.js';

// ---- a small CBOR reader: enough for an attestation object and a COSE public key ----
function cbor(bytes) {
  let i = 0;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = ai => ai < 24 ? ai : ai === 24 ? v.getUint8(i++) : ai === 25 ? (i += 2, v.getUint16(i - 2)) : ai === 26 ? (i += 4, v.getUint32(i - 4)) : ai === 27 ? (i += 8, Number(v.getBigUint64(i - 8))) : NaN;
  function item() {
    const b = v.getUint8(i++), mt = b >> 5, ai = b & 31;
    if (mt === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; throw new Error('cbor: unsupported simple value'); }
    const n = len(ai); if (Number.isNaN(n)) throw new Error('cbor: bad length');
    if (mt === 0) return n;
    if (mt === 1) return -1 - n;
    if (mt === 2) { const out = bytes.slice(i, i + n); i += n; return out; }
    if (mt === 3) { const out = new TextDecoder().decode(bytes.slice(i, i + n)); i += n; return out; }
    if (mt === 4) { const a = []; for (let k = 0; k < n; k++) a.push(item()); return a; }
    if (mt === 5) { const m = new Map(); for (let k = 0; k < n; k++) { const key = item(); m.set(key, item()); } return m; }
    if (mt === 6) return item(); // a tag: the value inside it
    throw new Error('cbor: bad type');
  }
  const out = item();
  return { value: out, end: i };
}

// The authenticator's data: the hash of the address it was made for, flags, a counter, and (when made) the new credential
function authData(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = { rpIdHash: bytes.slice(0, 32), flags: bytes[32], counter: v.getUint32(33) };
  out.up = !!(out.flags & 1); out.uv = !!(out.flags & 4); out.at = !!(out.flags & 64);
  if (out.at) {
    const idLen = v.getUint16(53);
    out.credId = bytes.slice(55, 55 + idLen);
    const key = cbor(bytes.slice(55 + idLen));
    out.coseKey = key.value;
  }
  return out;
}

// A COSE public key, as a JWK WebCrypto can use: ES256 (P-256) or RS256
function coseToJwk(m) {
  const kty = m.get(1), alg = m.get(3);
  if (kty === 2 && m.get(-1) === 1) return { alg: -7, jwk: { kty: 'EC', crv: 'P-256', x: b64u(m.get(-2)), y: b64u(m.get(-3)), ext: true } };
  if (kty === 3) return { alg: -257, jwk: { kty: 'RSA', n: b64u(m.get(-1)), e: b64u(m.get(-2)), alg: 'RS256', ext: true } };
  throw new Error(`passkey type not supported (${kty}/${alg})`);
}

// An ECDSA signature arrives DER-encoded; WebCrypto wants the two numbers side by side
function derToRaw(der) {
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const read = () => { if (der[i++] !== 2) throw new Error('bad signature'); const n = der[i++]; let b = der.slice(i, i + n); i += n; while (b.length > 32 && b[0] === 0) b = b.slice(1); const o = new Uint8Array(32); o.set(b, 32 - b.length); return o; };
  const r = read(), s = read(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}

const eq = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
function clientData(b64, type, challenge, origin) {
  const raw = unb64u(b64), c = JSON.parse(new TextDecoder().decode(raw));
  if (c.type !== type) throw new Error('wrong kind of request');
  if (c.challenge !== challenge) throw new Error('challenge does not match');
  if (c.origin !== origin) throw new Error(`wrong address (${c.origin})`);
  return raw;
}

// A new passkey: check what the browser sent and return its id and public key to keep
export async function verifyRegistration({ credential, challenge, origin, rpId }) {
  const r = credential && credential.response; if (!r) throw new Error('no passkey');
  clientData(r.clientDataJSON, 'webauthn.create', challenge, origin);
  const att = cbor(unb64u(r.attestationObject)).value, ad = authData(att.get('authData'));
  if (!eq(ad.rpIdHash, await sha256(rpId))) throw new Error('made for another address');
  if (!ad.up) throw new Error('no one was present');
  if (!ad.at || !ad.credId) throw new Error('no credential');
  const { alg, jwk } = coseToJwk(ad.coseKey);
  return { id: b64u(ad.credId), pub: JSON.stringify(jwk), alg, counter: ad.counter };
}

// A passkey used to sign in: check the signature with the public key kept when it was made
export async function verifyAssertion({ credential, challenge, origin, rpId, stored }) {
  const r = credential && credential.response; if (!r) throw new Error('no passkey');
  const cdRaw = clientData(r.clientDataJSON, 'webauthn.get', challenge, origin);
  const adRaw = unb64u(r.authenticatorData), ad = authData(adRaw);
  if (!eq(ad.rpIdHash, await sha256(rpId))) throw new Error('made for another address');
  if (!ad.up) throw new Error('no one was present');
  const signed = new Uint8Array(adRaw.length + 32); signed.set(adRaw); signed.set(await sha256(cdRaw), adRaw.length);
  const jwk = JSON.parse(stored.pub), sig = unb64u(r.signature);
  let ok;
  if (stored.alg === -7) {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(sig), signed);
  } else {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
  }
  if (!ok) throw new Error('signature does not match');
  // a passkey kept in one place counts up each time it is used; one that syncs (iCloud, Google) stays at nought
  if (stored.counter > 0 && ad.counter > 0 && ad.counter <= stored.counter) throw new Error('this passkey looks copied');
  return { counter: ad.counter, uv: ad.uv };
}
