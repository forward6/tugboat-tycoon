// Players across devices, end to end, against tools/devserver.mjs: node tools/accounts.js <outdir>
//  0. a robot opens the game and presses Open the season: the server hears nothing until a first decision (a loan); then
//     the save mark gets its tick, and at the season's end a player with no passkey is asked, once, to set one up
//  1. a device plays and sets up a passkey (Chromium's virtual authenticator), and is given a recovery code
//  2. a second device signs in with the same passkey (as if synced by iCloud) and finds the first device's games
//  3. a third signs in with the recovery code; a fourth tries a wrong one
//  4. on the old address, a device moves its games; on the new one they arrive
// Starts the dev server itself, on port 8792.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const OUT = process.argv[2] || '.', PORT = 8792, HOME = `http://localhost:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, 'devserver.mjs'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ADMIN_PLAYER: '' } });
  let log = ''; srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  for (let i = 0; i < 50 && !/devserver on/.test(log); i++) await sleep(100);
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP tugboat-tycoon.pages.dev 127.0.0.1'] }), errs = [];
  const device = async (name, url = HOME) => {
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    await p.addInitScript(() => { try { localStorage.setItem('tugboat-tour-v1', '1'); localStorage.setItem('tugboat-advice-off', '1'); } catch (e) {} window.__newHome = 'http://localhost:8792'; });
    const cdp = await ctx.newCDPSession(p); await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await p.goto(url); await p.waitForTimeout(1200);
    return { ctx, p, cdp, authenticatorId, name };
  };
  const text = p => p.evaluate(() => document.querySelector('#modalBody').innerText.replace(/\n+/g, ' | '));
  const me = p => p.evaluate(() => { const v = JSON.parse(localStorage.getItem('tugboat-player')); return `${v.name} (${v.id.slice(0, 6)}…)`; });
  const say = (who, what) => console.log(who.padEnd(10), what);
  // the game opens cards of its own (news, the end of a season): close any, then open Settings
  const settings = async p => { await p.evaluate(() => { const T = window.__tugboat; T.ui.queue = []; document.querySelector('#modal').hidden = true; T.ui.modalOpen = false; }); await p.click('[data-act="menu"]'); };

  // 0. a robot: the first button, then nothing; the server mustn't hear of it until a decision is made
  const R = await device('robot'), posts = [];
  R.p.on('request', q => { if (q.method() === 'POST' && /\/api\//.test(q.url())) posts.push(q.url().replace(HOME, '')); });
  await R.p.click('[data-act="play"]'); await R.p.waitForTimeout(2500);
  const rid = await R.p.evaluate(() => JSON.parse(localStorage.getItem('tugboat-player')).id);
  const onBoard = async () => (await (await fetch(`${HOME}/api/board?id=${rid}`)).json()).players.some(p => p.id === rid);
  say('robot', `pressed Open the season: ${posts.length} posts to the server, on the board: ${await onBoard()}`);
  await R.p.evaluate(() => { const T = window.__tugboat; T.ui.queue = []; document.querySelector('#modal').hidden = true; T.ui.modalOpen = false; });
  await R.p.click('[data-act="bank"]'); await R.p.click('#modalBody [data-act="borrow"]'); await R.p.waitForTimeout(2500);
  say('robot', `after a first decision (a loan): posts ${[...new Set(posts)].join(', ')}; on the board: ${await onBoard()}`);
  say('robot', 'save mark: ' + (await R.p.evaluate(() => { const b = document.getElementById('saveBtn'); return `${b.classList.contains('online') ? 'ticked' : 'no tick'}, "${b.title}"`; })));
  const card = () => R.p.evaluate(() => document.querySelector('#modal').hidden ? '(none)' : (document.querySelector('#modalBody h2') || {}).textContent);
  // the season's notices close with Escape, one after another, until the passkey card or the winter card
  const toWinter = async () => { await R.p.evaluate(() => window.__tugboat.advance(260)); for (let i = 0; i < 30 && !/safe|ice is in/i.test(await card()); i++) { await R.p.keyboard.press('Escape'); await sleep(120); } return card(); };
  say('robot', `end of the season: "${await toWinter()}"`);
  await R.p.click('#modalBody [data-act="nudgeNo"]'); await sleep(300);
  say('robot', `Not now: "${await card()}"; fit out: ${!!(await R.p.$('#modalBody [data-act="startSeason"]'))}`);
  await R.p.click('#modalBody [data-act="startSeason"]'); await sleep(400); await R.p.evaluate(() => { const T = window.__tugboat; T.ui.queue = []; document.querySelector('#modal').hidden = true; T.ui.modalOpen = false; });
  say('robot', `end of the next season: "${await toWinter()}" (asked only once)`);
  await R.ctx.close();

  // 1. the first device plays a little, saves, and sets up a passkey
  const A = await device('iPad');
  await A.p.click('[data-act="play"]'); await A.p.waitForTimeout(500);
  await A.p.evaluate(() => { const T = window.__tugboat; T.ui.queue = []; document.querySelector('#modal').hidden = true; T.ui.modalOpen = false; T.S.company = 'Kerr Towing'; T.advance(20); });
  await settings(A.p); await A.p.click('#modalBody [data-act="save"]'); await A.p.waitForTimeout(600);
  say('iPad', `plays as ${await me(A.p)}`);
  await settings(A.p); await A.p.waitForTimeout(800);
  say('iPad', 'Settings: ' + (await A.p.evaluate(() => document.querySelector('#acctBox').innerText.replace(/\n+/g, ' | '))));
  await A.p.screenshot({ path: `${OUT}/acct-settings.png` });
  await A.p.click('#acctBox [data-act="acctCreate"]'); await A.p.waitForTimeout(1500);
  const recovery = await A.p.evaluate(() => (document.querySelector('#recCode') || {}).textContent || '');
  say('iPad', `passkey made; recovery code shown: ${recovery}`);
  await A.p.screenshot({ path: `${OUT}/acct-code.png` });
  await A.p.click('#modalBody [data-act="menu"]'); await A.p.waitForTimeout(900);
  say('iPad', 'Settings now: ' + (await A.p.evaluate(() => document.querySelector('#acctBox').innerText.replace(/\n+/g, ' | '))));
  const { credentials } = await A.cdp.send('WebAuthn.getCredentials', { authenticatorId: A.authenticatorId });
  say('iPad', `${credentials.length} passkey on the device, for ${credentials[0] && credentials[0].rpId}`);

  // 2. a second device: the same passkey, as iCloud would sync it
  const B = await device('iPhone');
  await B.cdp.send('WebAuthn.addCredential', { authenticatorId: B.authenticatorId, credential: credentials[0] });
  say('iPhone', `starts as ${await me(B.p)}; title has Sign in: ${!!(await B.p.$('#modalBody [data-act="titleSignIn"]'))}`);
  await B.p.click('#modalBody [data-act="titleSignIn"]'); await B.p.waitForTimeout(300);
  await B.p.screenshot({ path: `${OUT}/acct-signin.png` });
  await B.p.click('#modalBody [data-act="acctSignIn"]'); await B.p.waitForTimeout(2000);
  say('iPhone', `after passkey sign-in: ${await me(B.p)}`);
  say('iPhone', 'card: ' + (await text(B.p)).slice(0, 300));
  await B.p.screenshot({ path: `${OUT}/acct-games.png` });

  // 3. a third device with the recovery code, and a fourth with a wrong one
  const C = await device('Mac');
  await C.p.click('#modalBody [data-act="titleSignIn"]'); await C.p.fill('#recInput', recovery.toLowerCase().replace(/-/g, ' '));
  await C.p.click('#modalBody [data-act="acctRecover"]'); await C.p.waitForTimeout(1500);
  say('Mac', `recovery code (typed in lower case, with spaces): ${await me(C.p)}`);
  const D = await device('Windows');
  await D.p.click('#modalBody [data-act="titleSignIn"]'); await D.p.fill('#recInput', 'ANCHOR-BIRCH-COVE-GULL-1234');
  await D.p.click('#modalBody [data-act="acctRecover"]'); await D.p.waitForTimeout(800);
  say('Windows', `wrong code: "${await D.p.evaluate(() => document.querySelector('#acctMsg').textContent)}", still ${await me(D.p)}`);
  // sign out on the Mac
  C.p.on('dialog', d => d.accept());
  await C.p.evaluate(() => { document.querySelector('#modal').hidden = true; window.__tugboat.ui.modalOpen = false; });
  await settings(C.p); await C.p.waitForTimeout(900);
  await C.p.click('#acctBox [data-act="acctSignOut"]'); await C.p.waitForTimeout(800);
  say('Mac', `signed out: now ${await me(C.p)}`);

  // 4. the old address: a device with a game moves it to the new one
  const O = await device('old iPad', `http://tugboat-tycoon.pages.dev:${PORT}/`);
  say('old iPad', 'title: ' + (await text(O.p)).match(/Tugboat Tycoon has moved[^|]*/)?.[0]);
  await O.p.click('[data-act="play"]'); await O.p.waitForTimeout(500);
  await O.p.evaluate(() => { const T = window.__tugboat; T.ui.queue = []; document.querySelector('#modal').hidden = true; T.ui.modalOpen = false; T.S.company = 'Ross Towing'; T.advance(30); });
  const oldId = await me(O.p);
  await settings(O.p); await O.p.waitForTimeout(500);
  say('old iPad', 'Settings: ' + (await O.p.evaluate(() => document.querySelector('#acctBox').innerText.replace(/\n+/g, ' | '))));
  await Promise.all([O.p.waitForURL(/localhost/, { timeout: 15000 }), O.p.click('#acctBox [data-act="moveGames"]')]);
  await O.p.waitForTimeout(2500);
  say('new site', `arrived as ${await me(O.p)} (was ${oldId}); url ${O.p.url()}`);
  say('new site', 'card: ' + (await text(O.p)).slice(0, 300));
  await O.p.screenshot({ path: `${OUT}/acct-moved.png` });

  console.log('errors', errs.length ? errs : '[]');
  await b.close(); srv.kill();
})();
