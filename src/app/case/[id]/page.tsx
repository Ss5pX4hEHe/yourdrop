import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { caseMap, itemMap } from '@/lib/catalog';
import { CaseView } from '@/components/CaseView';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const box = caseMap.get((await params).id);
  return { title: box ? `${box.name} — Your Drop` : 'Кейс не найден' };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const box = caseMap.get(id);
  if (!box) notFound();
  const { items, ...meta } = box;
  const rows = items.map(r => ({ ...itemMap.get(r.id)!, weight: r.weight })).filter(r => r.id).sort((a, b) => b.price - a.price);
  return <CaseView box={meta} rows={rows} />;
}
