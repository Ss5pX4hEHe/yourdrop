import type { D1 } from './db';
import { fresh } from './game';

const YEAR = 31536000;
const uuid = () => crypto.randomUUID();
const cookie = (req: Request, name: string, value: string, maxAge = YEAR) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
const read = (req: Request, name: string) => { const raw = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1]; return raw && /^[a-f0-9-]{32,40}$/.test(raw) ? raw : null; };

/** Short human label for a session, built from the User-Agent. */
export function deviceLabel(ua: string | null) {
  const s = ua ?? '';
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS X/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : 'Устройство';
  const browser = /Telegram/i.test(s) ? 'Telegram' : /YaBrowser|YaApp/i.test(s) ? 'Яндекс' : /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Браузер';
  return `${os} · ${browser}`;
}

export type Session = { sessionId: string; profileId: string; cookies: string[] };

/**
 * Resolves the device session. A device is identified by the yd_session cookie; the session row
 * points to a profile. Old yd_profile cookies are migrated to a session once and then cleared, so
 * revoking a session really logs that device out.
 */
export async function resolveSession(database: D1, req: Request): Promise<Session> {
  const now = Date.now();
  const sid = read(req, 'yd_session');
  if (sid) {
    const row = await database.prepare('SELECT profile_id, last_seen FROM sessions WHERE id = ?').bind(sid).first<{ profile_id: string; last_seen: number }>();
    if (row) {
      if (now - row.last_seen > 5 * 60 * 1000) await database.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').bind(now, sid).run();
      return { sessionId: sid, profileId: row.profile_id, cookies: [] };
    }
  }
  const legacy = read(req, 'yd_profile');
  const profileId = legacy ?? uuid();
  await database.prepare('INSERT OR IGNORE INTO profiles (id, state, version) VALUES (?, ?, 0)').bind(profileId, JSON.stringify(fresh())).run();
  return startSession(database, req, profileId);
}

/** Creates a fresh session row for this device and returns the cookies to set. */
export async function startSession(database: D1, req: Request, profileId: string): Promise<Session> {
  const now = Date.now(), sessionId = uuid();
  await database.prepare('INSERT INTO sessions (id, profile_id, label, created, last_seen) VALUES (?, ?, ?, ?, ?)').bind(sessionId, profileId, deviceLabel(req.headers.get('user-agent')), now, now).run();
  return { sessionId, profileId, cookies: [cookie(req, 'yd_session', sessionId), cookie(req, 'yd_profile', '', 0)] };
}

export async function endSession(database: D1, sessionId: string) { await database.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run(); }

export function withCookies(headers: Record<string, string>, cookies: string[]) {
  const h = new Headers(headers); for (const c of cookies) h.append('Set-Cookie', c); return h;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function randomCode(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}
/** Returns the profile's public id, creating one on first use. */
export async function ensurePublicId(database: D1, profileId: string) {
  const existing = await database.prepare('SELECT public_id FROM public_links WHERE profile_id = ?').bind(profileId).first<{ public_id: string }>();
  if (existing) return existing.public_id;
  for (let i = 0; i < 5; i++) {
    const publicId = randomCode(10).toLowerCase();
    const r = await database.prepare('INSERT OR IGNORE INTO public_links (public_id, profile_id, created) VALUES (?, ?, ?)').bind(publicId, profileId, Date.now()).run();
    if (r.meta.changes) return publicId;
  }
  const again = await database.prepare('SELECT public_id FROM public_links WHERE profile_id = ?').bind(profileId).first<{ public_id: string }>();
  if (!again) throw new Error('Не удалось создать публичную ссылку');
  return again.public_id;
}
