import { db } from '@/lib/db';
import { fresh } from '@/lib/game';
import { cookieHeader, randomCode, readProfileId } from '@/lib/session';
export const dynamic = 'force-dynamic';

const TTL = 15 * 60 * 1000;
type Body = { action: 'create' | 'redeem' | 'detach'; code?: string };

export async function POST(req: Request) {
  const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  let body: Body; try { body = await req.json() as Body; } catch { return Response.json({ error: 'Некорректный запрос' }, { status: 400 }); }
  try {
    const database = await db();
    const current = readProfileId(req);
    if (body.action === 'create') {
      if (!current) return Response.json({ error: 'Профиль ещё не создан — откройте любую страницу сайта' }, { status: 400 });
      await database.prepare('DELETE FROM device_links WHERE profile_id = ? OR expires < ?').bind(current, Date.now()).run();
      const code = randomCode(8), expires = Date.now() + TTL;
      await database.prepare('INSERT INTO device_links (code, profile_id, expires) VALUES (?, ?, ?)').bind(code, current, expires).run();
      return Response.json({ code: code.slice(0, 4) + '-' + code.slice(4), expires }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action === 'redeem') {
      const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 8) return Response.json({ error: 'Код состоит из 8 символов' }, { status: 400 });
      const row = await database.prepare('SELECT profile_id, expires FROM device_links WHERE code = ?').bind(code).first<{ profile_id: string; expires: number }>();
      if (!row || row.expires < Date.now()) return Response.json({ error: 'Код не найден или истёк. Создайте новый на первом устройстве' }, { status: 404 });
      await database.prepare('DELETE FROM device_links WHERE code = ?').bind(code).run();
      const exists = await database.prepare('SELECT 1 FROM profiles WHERE id = ?').bind(row.profile_id).first();
      if (!exists) return Response.json({ error: 'Профиль не найден' }, { status: 404 });
      return Response.json({ ok: true, same: row.profile_id === current }, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookieHeader(req, row.profile_id) } });
    }
    if (body.action === 'detach') {
      const id = crypto.randomUUID();
      await database.prepare('INSERT OR IGNORE INTO profiles (id, state, version) VALUES (?, ?, 0)').bind(id, JSON.stringify(fresh())).run();
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookieHeader(req, id) } });
    }
    return Response.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (e) { console.error(e); return Response.json({ error: 'Синхронизация временно недоступна' }, { status: 503 }); }
}
