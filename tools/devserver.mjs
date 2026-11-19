// A local stand-in for Cloudflare Pages, to test the game and its server functions together:
//   node tools/devserver.mjs [port] [kv.json]
// serves site/, runs functions/_middleware.js and functions/api/*.js, with a D1 database kept in memory (Node's own
// SQLite) and, if a JSON file is given, a stand-in for the old Workers KV (PLAYS) to import from. ADMIN_PLAYER can be
// set in the environment. Exposes the database for tests as globalThis.__db.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = +(process.argv[2] || 8790), kvFile = process.argv[3];

// ---- D1, near enough: prepare / bind / first / all / run, and batch in a transaction ----
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a.map(x => x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x)); }
  _s() { return this.db.prepare(this.sql); }
  async first(col) { const r = this._s().get(...this.args); return r == null ? null : col ? (r[col] ?? null) : { ...r }; }
  async all() { return { results: this._s().all(...this.args).map(r => ({ ...r })), success: true }; }
  async run() { const r = this._s().run(...this.args); return { success: true, meta: { changes: Number(r.changes) } }; }
}
class D1 {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) { this.db.exec('BEGIN'); try { const out = []; for (const s of stmts) out.push(/^\s*select/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
}
// ---- Workers KV, near enough ----
class KV {
  constructor(o) { this.m = new Map(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])); }
  async get(k, t) { const v = this.m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, v); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; }
}
const env = { DB: new D1(), ADMIN_PLAYER: process.env.ADMIN_PLAYER || '' };
if (kvFile) env.PLAYS = new KV(JSON.parse(fs.readFileSync(kvFile, 'utf8')));
globalThis.__db = env.DB;

const middleware = (await import(path.join(root, 'functions/_middleware.js'))).onRequest;
const routes = {};
for (const f of fs.readdirSync(path.join(root, 'functions/api'))) routes[f.replace(/\.js$/, '')] = await import(path.join(root, 'functions/api', f));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

http.createServer(async (q, s) => {
  try {
    const body = await new Promise(res => { const c = []; q.on('data', d => c.push(d)); q.on('end', () => res(Buffer.concat(c))); });
    const url = `http://${q.headers.host}${q.url}`;
    const request = new Request(url, { method: q.method, headers: q.headers, body: ['GET', 'HEAD'].includes(q.method) ? undefined : body });
    const next = async () => {
      const u = new URL(url), m = u.pathname.match(/^\/api\/([a-z]+)$/);
      if (m && routes[m[1]]) { const h = routes[m[1]][`onRequest${q.method[0] + q.method.slice(1).toLowerCase()}`]; return h ? h({ request, env }) : new Response('no', { status: 405 }); }
      const f = path.join(root, 'site', u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
      if (!f.startsWith(path.join(root, 'site')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('not found', { status: 404 });
      return new Response(fs.readFileSync(f), { headers: { 'content-type': types[path.extname(f)] || 'application/octet-stream' } });
    };
    const r = await middleware({ request, next, env });
    s.writeHead(r.status, Object.fromEntries(r.headers)); s.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { console.error(e); s.writeHead(500); s.end(String(e)); }
}).listen(port, () => console.log(`devserver on http://localhost:${port}`));
