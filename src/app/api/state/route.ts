import { db } from '@/lib/db';
import { act, fresh, settle } from '@/lib/game';
import { lookupFor } from '@/lib/catalog';
import type { Action, Result, State } from '@/lib/types';
import { normalizeProgress } from '@/lib/progression';
import { cookieHeader, ensurePublicId, readProfileId } from '@/lib/session';
export const dynamic = 'force-dynamic';

function respond(state: State, result: Result, headers: Record<string, string>) {
  const ids = new Set<number>();
  for (const i of state.inventory) ids.add(i.id);
  for (const e of state.history) for (const id of e.items) ids.add(id);
  for (const i of result.items ?? []) ids.add(i.id);
  if (state.progress?.stats.bestDrop) ids.add(state.progress.stats.bestDrop.id);
  return Response.json({ state, result, lookup: lookupFor(ids) }, { headers });
}

async function handle(req: Request, action?: Action) {
  const id = readProfileId(req) ?? crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'Set-Cookie': cookieHeader(req, id) };
  const database = await db();
  const publicId = action?.type === 'share' && action.share?.enabled ? await ensurePublicId(database, id) : null;
  await database.prepare('INSERT OR IGNORE INTO profiles (id, state, version) VALUES (?, ?, 0)').bind(id, JSON.stringify(fresh())).run();
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await database.prepare('SELECT state, version FROM profiles WHERE id = ?').bind(id).first<{ state: string; version: number }>();
    if (!row) throw new Error('Не удалось загрузить профиль');
    const state: State = JSON.parse(row.state); let output: { state: State; result: Result };
    if (publicId) { normalizeProgress(state); state.progress!.publicId = publicId; }
    try { if (action) output = act(state, action); else { settle(state); normalizeProgress(state); output = { state, result: {} }; } }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Ошибка действия' }, { status: 400, headers }); }
    const next = JSON.stringify(output.state);
    if (next === row.state) return respond(output.state, output.result, headers);
    const updated = await database.prepare('UPDATE profiles SET state = ?, version = version + 1 WHERE id = ? AND version = ?').bind(next, id, row.version).run();
    if (updated.meta.changes) return respond(output.state, output.result, headers);
  }
  return Response.json({ error: 'Одновременно выполняется другое действие. Попробуйте ещё раз' }, { status: 409, headers });
}

export async function GET(req: Request) {
  try { return await handle(req); }
  catch (e) { console.error(e); return Response.json({ error: 'Сохранение временно недоступно. Повторите загрузку' }, { status: 503 }); }
}
export async function POST(req: Request) {
  const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  let body: Action;
  try { body = await req.json() as Action; } catch { return Response.json({ error: 'Некорректный запрос' }, { status: 400 }); }
  if (!body || typeof body.type !== 'string' || typeof body.requestId !== 'string' || body.requestId.length > 80) return Response.json({ error: 'Некорректный запрос' }, { status: 400 });
  try { return await handle(req, body); }
  catch (e) { console.error(e); return Response.json({ error: 'Не удалось сохранить действие. Обновите страницу перед повтором' }, { status: 503 }); }
}
