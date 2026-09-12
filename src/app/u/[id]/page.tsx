import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { itemMap } from '@/lib/catalog';
import { normalizeProgress } from '@/lib/progression';
import { ACHIEVEMENTS, ROUTE_TITLES } from '@/lib/rewards';
import { RARITY, rub, type State } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function load(id: string) {
  if (!/^[a-z0-9]{6,16}$/.test(id)) return null;
  const database = await db();
  const link = await database.prepare('SELECT profile_id FROM public_links WHERE public_id = ?').bind(id).first<{ profile_id: string }>();
  if (!link) return null;
  const row = await database.prepare('SELECT state FROM profiles WHERE id = ?').bind(link.profile_id).first<{ state: string }>();
  if (!row) return null;
  const state: State = JSON.parse(row.state);
  const progress = normalizeProgress(state);
  if (!progress.share?.enabled) return null;
  return { state, progress };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const data = await load((await params).id).catch(() => null);
  return { title: data ? `${data.progress.title} — витрина Your Drop` : 'Витрина не найдена', robots: { index: false } };
}

export default async function PublicShowcase({ params }: { params: Promise<{ id: string }> }) {
  const data = await load((await params).id).catch(() => null);
  if (!data) notFound();
  const { state, progress } = data;
  const items = progress.showcase.flatMap(uid => { const o = state.inventory.find(i => i.uid === uid); const it = o && itemMap.get(o.id); return o && it ? [{ ...o, item: it }] : []; });
  const total = items.reduce((s, i) => s + i.value, 0);
  const inventoryValue = state.inventory.reduce((s, i) => s + i.value, 0);
  const badges = ACHIEVEMENTS.filter(a => progress.achievements.includes(a.id));
  const routesDone = progress.achievements.filter(a => a.startsWith('route:')).map(a => ROUTE_TITLES[a.slice(6)]).filter(Boolean);
  const st = progress.stats;
  return <div className="public-page">
    <span className="eyebrow">YOUR DROP / ПУБЛИЧНАЯ ВИТРИНА</span>
    <section className={`showcase-stage background-${progress.background} frame-${progress.frame}`} style={{ marginTop: 12 }}>
      <div className="showcase-heading"><div className="profile-monogram">{progress.title.trim().slice(0, 2).toUpperCase() || 'YD'}</div><div><span className="eyebrow">КОЛЛЕКЦИЯ</span><h2>{progress.title}</h2>{progress.share?.badges && <div className="showcase-badges">{badges.map(a => <span key={a.id} title={a.name} aria-label={a.name}>{a.badge}</span>)}</div>}</div>{progress.share?.value && <div className="showcase-total"><strong>{rub(total)}</strong><small>стоимость витрины</small></div>}</div>
      {items.length ? <div className="public-grid">{items.map(o => <div key={o.uid} className="public-item" style={{ ['--rc' as string]: RARITY[o.item.rarity]?.color ?? RARITY._unknown.color }}>{o.item.image ? <img src={o.item.image} alt="" loading="lazy" /> : <div className="skin-placeholder"><span>CS2</span></div>}<b title={o.item.name}>{o.item.finish ? o.item.name.split(' | ')[0] : o.item.name}</b><span>{o.item.finish || RARITY[o.item.rarity]?.label}</span>{progress.share?.value && <strong>{rub(o.value)}</strong>}</div>)}</div> : <div className="showcase-empty"><b>Витрина пока пуста</b><p>Владелец ещё не выбрал предметы для показа.</p></div>}
    </section>
    {progress.share?.stats && <div className="public-stats">
      <div className="stat"><b>{st.caseOpens.toLocaleString('ru-RU')}</b><span>кейсов открыто</span></div>
      <div className="stat"><b>{st.upgradeWins}/{st.upgradeAttempts}</b><span>апгрейдов удалось</span></div>
      <div className="stat"><b>{badges.length + routesDone.length}</b><span>достижений и маршрутов</span></div>
      {progress.share?.value ? <div className="stat"><b>{rub(inventoryValue)}</b><span>стоимость инвентаря</span></div> : <div className="stat"><b>{state.inventory.length}</b><span>предметов в инвентаре</span></div>}
    </div>}
    {routesDone.length > 0 && progress.share?.badges && <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Пройденные маршруты: {routesDone.join(', ')}</p>}
    <div className="public-cta"><span>Это витрина игрока Your Drop — симулятора кейсов CS2 с виртуальным балансом.</span><Link href="/" className="btn btn-ghost btn-sm">Собрать свою коллекцию</Link></div>
  </div>;
}
