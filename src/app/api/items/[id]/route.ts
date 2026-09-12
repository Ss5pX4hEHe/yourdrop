import { catalog, itemMap, caseLite } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const item = itemMap.get(Number((await params).id));
  if (!item) return Response.json({ error: 'Предмет не найден' }, { status: 404 });
  const cases = catalog.cases.filter(c => c.items.some(i => i.id === item.id)).map(c => ({ ...caseLite(c), chance: c.items.find(i => i.id === item.id)!.weight }));
  return Response.json({ item, cases, sourceDate: catalog.sourceDate }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
