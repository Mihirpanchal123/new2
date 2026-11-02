// =====================================================================
//  SITE CONFIG (server side) - what /admin sets for every visitor: the
//  game settings that used to sit in the builder's Settings panel, and
//  which Journey worlds (and Pokémon Battle Royale) are open, "coming soon",
//  or open only to visitors who type that one's password. Shared by the Netlify
//  Function (netlify/functions/site-config.mjs, stored in Netlify Blobs)
//  and the local server (serve.mjs, stored in a JSON file).
//  The password is checked here, on the server: the page never has it.
//  Set ADMIN_USER / ADMIN_PASS (and optionally ADMIN_SECRET) as
//  environment variables on Netlify to replace the built-in login.
// =====================================================================
import crypto from 'node:crypto';

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const hmac = (key, s) => crypto.createHmac('sha256', key).update(String(s)).digest('hex');
// the built-in login (the password only as a hash)
const DEFAULT_USER = 'Admin123';
const DEFAULT_PASS_SHA256 = '2bde92f61b7da23f57d668a3390a7f4dabd716c98c57d6404c0130c17e73193f';
const SESSION_MS = 12 * 3600 * 1000;

const creds = env => ({ user: env.ADMIN_USER || DEFAULT_USER, passHash: env.ADMIN_PASS ? sha(env.ADMIN_PASS) : DEFAULT_PASS_SHA256 });
const secret = env => env.ADMIN_SECRET || sha('pokemon-arena-admin:' + creds(env).user + ':' + creds(env).passHash);
// compare without leaking where two strings differ
const same = (a, b) => crypto.timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));

// a session token: its expiry time, signed
function login(env, user, pass) {
  const c = creds(env);
  const ok = same(String(user || ''), c.user) & same(sha(String(pass || '')), c.passHash);
  if (!ok) return null;
  const exp = String(Date.now() + SESSION_MS);
  return exp + '.' + hmac(secret(env), exp);
}
function verify(env, token) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || !(+exp > Date.now())) return false;
  return same(sig, hmac(secret(env), exp));
}

// ---- what can be set, and how: anything else in a request is dropped
const THEMES = ['random', 'stadium', 'forest', 'volcano', 'beach', 'icecave', 'city'];
const SCHEMA = {
  level: v => Number.isInteger(+v) && +v >= 1 && +v <= 100 ? +v : undefined,
  theme: v => THEMES.includes(v) ? v : undefined,
  speed: v => ['1', '0.6', '0.35'].includes(String(v)) ? String(v) : undefined,
  length: v => ['1', '2', '3'].includes(String(v)) ? String(v) : undefined,
  pool: v => ['final', 'any'].includes(v) ? v : undefined,
  sudden: v => ['0', '30', '45', '60', '90'].includes(String(v)) ? String(v) : undefined,
  music: v => typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 100) / 100 : undefined,
  sfx: v => typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 100) / 100 : undefined,
  channel: v => typeof v === 'string' ? v.trim().slice(0, 28) : undefined,
  ...Object.fromEntries(['auto', 'mute', 'replays', 'fps', 'flashes', 'cutins', 'shorts', 'journeyInfinite'].map(k => [k, v => typeof v === 'boolean' ? v : undefined]))
};
const WORLDS = ['valoria', 'meridia'];
// what can be locked: each Journey world and Pokémon Battle Royale (all 3 modes). Each is 'open', 'soon'
// (coming soon) or 'password' (open to visitors who type that section's password)
const SECTIONS = [...WORLDS, 'battle'];
const STATES = ['open', 'soon', 'password'];
const stateOf = (c, sec) => { const v = sec === 'battle' ? c && c.battle : c && c.journey && c.journey[sec]; return STATES.includes(v) ? v : 'open'; };

// prev: the saved config (it keeps a section's password when the admin leaves its field empty)
function sanitize(c, prev) {
  const out = { journey: {}, game: {} };
  for (const w of WORLDS) out.journey[w] = stateOf(c, w);
  out.battle = stateOf(c, 'battle');
  const pw = c && c.passwords && typeof c.passwords === 'object' ? c.passwords : {};
  for (const sec of SECTIONS) {
    const pass = typeof pw[sec] === 'string' ? pw[sec].trim().slice(0, 64) : '';
    const lock = pass ? hashPass(pass) : prev && prev.secret && prev.secret[sec];
    if (lock) (out.secret = out.secret || {})[sec] = lock;
  }
  for (const [k, check] of Object.entries(SCHEMA)) { const v = c && c.game ? check(c.game[k]) : undefined; if (v !== undefined) out.game[k] = v; }
  out.updated = new Date().toISOString();
  return out;
}

// ---- section passwords: only their scrypt hash is kept, and the browser never sees that.
// A visitor who types one gets an unlock token for that section (signed with its salt, so a new password ends
// every old token); the browser sends its tokens back with each config read (x-unlock: "battle:tok,valoria:tok")
// and the answer says which still count.
function hashPass(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pass, salt, 32).toString('hex') };
}
const passOk = (lock, pass) => !!lock && same(crypto.scryptSync(String(pass || '').trim().slice(0, 64), lock.salt, 32).toString('hex'), lock.hash);
const unlockToken = (env, sec, lock) => hmac(secret(env), 'unlock:' + sec + ':' + lock.salt);
function readUnlocks(header) {
  const out = {};
  for (const part of String(header || '').slice(0, 2000).split(',')) { const i = part.indexOf(':'); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}
// what anyone may read: no secrets, plus which passwords are set and which of this visitor's unlocks are good
function publicConfig(env, c, unlockHeader) {
  const { secret: sec = {}, ...pub } = c;
  const tokens = readUnlocks(unlockHeader);
  pub.passSet = {}; pub.unlocked = {};
  for (const s of SECTIONS) {
    pub.passSet[s] = !!sec[s];
    if (stateOf(c, s) === 'password') pub.unlocked[s] = !!(sec[s] && tokens[s] && same(tokens[s], unlockToken(env, s, sec[s])));
  }
  return pub;
}

// One request: GET (anyone) reads the config; POST { user, pass } logs in; POST { token, config } saves;
// POST { unlock: <section>, pass } trades a section's password for its unlock token.
// unlock: the x-unlock header (a visitor's unlock tokens). store: { get() -> config | null, set(config) }. Returns { status, json }.
export async function handle({ method, body, unlock }, env, store) {
  if (method === 'GET') {
    const saved = await store.get();
    if (saved) return { status: 200, json: publicConfig(env, saved, unlock) };
    const d = sanitize({}); delete d.updated; return { status: 200, json: publicConfig(env, d) };
  }
  if (method !== 'POST') return { status: 405, json: { error: 'Method not allowed' } };
  let b;
  try { b = JSON.parse(body || '{}'); } catch (e) { return { status: 400, json: { error: 'Bad request' } }; }
  if (b.unlock != null) {
    const saved = await store.get();
    const sec = String(b.unlock);
    const lock = SECTIONS.includes(sec) && saved && stateOf(saved, sec) === 'password' && saved.secret && saved.secret[sec];
    if (!lock) return { status: 400, json: { error: 'This needs no password right now' } };
    if (!passOk(lock, b.pass)) { await new Promise(r => setTimeout(r, 700)); return { status: 401, json: { error: 'Wrong password' } }; }
    return { status: 200, json: { ok: true, token: unlockToken(env, sec, lock) } };
  }
  if (b.user != null || b.pass != null) {
    const token = login(env, b.user, b.pass);
    if (!token) { await new Promise(r => setTimeout(r, 700)); return { status: 401, json: { error: 'Wrong username or password' } }; }
    return { status: 200, json: { token } };
  }
  if (!verify(env, b.token)) return { status: 401, json: { error: 'Your session has ended: log in again' } };
  const config = sanitize(b.config, await store.get());
  const NAMES = { valoria: 'Journey', meridia: 'Journey II', battle: 'Pokémon Battle Royale' };
  const missing = SECTIONS.find(sec => stateOf(config, sec) === 'password' && !(config.secret && config.secret[sec]));
  if (missing) return { status: 400, json: { error: 'Type a password for ' + NAMES[missing] + ' first' } };
  await store.set(config);
  return { status: 200, json: { ok: true, config: publicConfig(env, config) } };
}
