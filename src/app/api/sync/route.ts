import { db } from '@/lib/db';
import { fresh } from '@/lib/game';
import { endSession, randomCode, resolveSession, startSession, withCookies } from '@/lib/session';
export const dynamic = 'force-dynamic';

const TTL = 15 * 60 * 1000;
type Body = { action: 'create' | 'redeem' | 'detach' | 'sessions' | 'revoke' | 'revoke_others'; code?: string; id?: string };

export async function POST(req: Request) {
  const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  let body: Body; try { body = await req.json() as Body; } catch { return Response.json({ error: 'Некорректный запрос' }, { status: 400 }); }
  try {
    const database = await db();
    const session = await resolveSession(database, req);
    const json = (data: unknown, extra: string[] = [], status = 200) => Response.json(data, { status, headers: withCookies({ 'Cache-Control': 'no-store' }, [...session.cookies, ...extra]) });
    const current = session.profileId;
    if (body.action === 'create') {
      await database.prepare('DELETE FROM device_links WHERE profile_id = ? OR expires < ?').bind(current, Date.now()).run();
      const code = randomCode(8), expires = Date.now() + TTL;
      await database.prepare('INSERT INTO device_links (code, profile_id, expires) VALUES (?, ?, ?)').bind(code, current, expires).run();
      return json({ code: code.slice(0, 4) + '-' + code.slice(4), expires });
    }
    if (body.action === 'redeem') {
      const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 8) return json({ error: 'Код состоит из 8 символов' }, [], 400);
      const row = await database.prepare('SELECT profile_id, expires FROM device_links WHERE code = ?').bind(code).first<{ profile_id: string; expires: number }>();
      if (!row || row.expires < Date.now()) return json({ error: 'Код не найден или истёк. Создайте новый на первом устройстве' }, [], 404);
      await database.prepare('DELETE FROM device_links WHERE code = ?').bind(code).run();
      const exists = await database.prepare('SELECT 1 FROM profiles WHERE id = ?').bind(row.profile_id).first();
      if (!exists) return json({ error: 'Профиль не найден' }, [], 404);
      if (row.profile_id === current) return json({ ok: true, same: true });
      await endSession(database, session.sessionId);
      const next = await startSession(database, req, row.profile_id);
      return Response.json({ ok: true, same: false }, { headers: withCookies({ 'Cache-Control': 'no-store' }, next.cookies) });
    }
    if (body.action === 'detach') {
      const id = crypto.randomUUID();
      await database.prepare('INSERT OR IGNORE INTO profiles (id, state, version) VALUES (?, ?, 0)').bind(id, JSON.stringify(fresh())).run();
      await endSession(database, session.sessionId);
      const next = await startSession(database, req, id);
      return Response.json({ ok: true }, { headers: withCookies({ 'Cache-Control': 'no-store' }, next.cookies) });
    }
    if (body.action === 'sessions') {
      const rows = await database.prepare('SELECT id, label, created, last_seen FROM sessions WHERE profile_id = ? ORDER BY last_seen DESC').bind(current).all<{ id: string; label: string; created: number; last_seen: number }>();
      return json({ sessions: rows.results.map(r => ({ id: r.id, label: r.label, created: r.created, lastSeen: r.last_seen, current: r.id === session.sessionId })) });
    }
    if (body.action === 'revoke') {
      const id = String(body.id ?? '');
      if (id === session.sessionId) return json({ error: 'Текущий сеанс завершать нельзя — используйте «Отвязать»' }, [], 400);
      await database.prepare('DELETE FROM sessions WHERE id = ? AND profile_id = ?').bind(id, current).run();
      return json({ ok: true });
    }
    if (body.action === 'revoke_others') {
      await database.prepare('DELETE FROM sessions WHERE profile_id = ? AND id != ?').bind(current, session.sessionId).run();
      return json({ ok: true });
    }
    return json({ error: 'Неизвестное действие' }, [], 400);
  } catch (e) { console.error(e); return Response.json({ error: 'Синхронизация временно недоступна' }, { status: 503 }); }
}
