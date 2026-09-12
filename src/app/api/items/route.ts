import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') ?? '').trim().toLowerCase();
  const price = (key: string, fallback: number) => p.get(key)?.trim() ? Number(p.get(key)!.trim().replace(',', '.')) : fallback;
  const min = price('min', 0);
  const max = price('max', Infinity);
  if (!Number.isFinite(min) || min < 0 || (p.get('max')?.trim() && !Number.isFinite(max)) || max < min) {
    return Response.json({ error: 'Некорректный диапазон цен' }, { status: 400 });
  }
  const sort = p.get('sort') === 'desc' ? 'desc' : 'asc';
  const type = p.get('type') ?? '';
  const limit = Math.floor(Math.min(200, Math.max(1, Number(p.get('limit') ?? 60) || 60)));
  const offset = Math.floor(Math.max(0, Number(p.get('offset') ?? 0) || 0));
  const words = q.split(/\s+/).filter(Boolean);
  const rows = catalog.items.filter(i => i.type !== 'bonus' && i.price >= min && i.price <= max && (!type || i.type === type) && (!words.length || words.every(w => i.name.toLowerCase().includes(w))));
  rows.sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price));
  return Response.json({ total: rows.length, items: rows.slice(offset, offset + limit) }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
