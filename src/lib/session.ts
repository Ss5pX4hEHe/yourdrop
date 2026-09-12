import type { D1 } from './db';

export const COOKIE = 'yd_profile';
export function readProfileId(req: Request) {
  const raw = req.headers.get('cookie')?.match(/(?:^|;\s*)yd_profile=([^;]+)/)?.[1];
  return raw && /^[a-f0-9-]{36}$/.test(raw) ? raw : null;
}
export function cookieHeader(req: Request, id: string) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
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
