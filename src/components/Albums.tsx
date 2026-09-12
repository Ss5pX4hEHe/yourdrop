'use client';
import { useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import type { Album } from '@/lib/collections';

export function Albums({ albums }: { albums: Album[] }) {
  const { state, loading } = useStore();
  const [missingOnly, setMissingOnly] = useState(false);
  const acquired = new Set(state?.progress?.acquired ?? []);
  const complete = albums.filter(a => a.items.every(i => acquired.has(i.id))).length;
  return <><div className="page-title-row"><div><h1>Альбом коллекций</h1><p className="lead">Получите каждый скин хотя бы один раз. Продажа и апгрейд не стирают прогресс.</p></div><div className="collection-counter"><b>{complete}<span>/{albums.length}</span></b><small>коллекций собрано</small></div></div>
    <label className="inline-check"><input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} />Показывать только недостающие предметы</label>
    {loading ? <div className="skeleton" /> : albums.map(album => {
      const count = album.items.filter(i => acquired.has(i.id)).length;
      const done = count === album.items.length;
      const visible = album.items.filter(i => !missingOnly || !acquired.has(i.id));
      return <section className={'panel album' + (done ? ' complete' : '')} key={album.id}>
        <div className="album-heading"><div><span className="eyebrow">{done ? 'КОЛЛЕКЦИЯ СОБРАНА ✓' : 'ВАША КОЛЛЕКЦИЯ'}</span><h2>{album.title}</h2><p>{album.description}</p></div><strong>{count} / {album.items.length}</strong></div>
        <progress value={count} max={album.items.length} aria-label={'Прогресс: ' + album.title} />
        {visible.length ? <div className="album-items">{visible.map(item => <div key={item.id} className={'album-item ' + (acquired.has(item.id) ? 'obtained' : 'missing')}><ItemCard item={item} /><span className="album-item-status">{acquired.has(item.id) ? state?.inventory.some(o => o.id === item.id) ? '✓ В инвентаре' : '✓ Уже получен' : 'Ещё не получен'}</span></div>)}</div> : <div className="empty green">Полный комплект. Все предметы получены!</div>}
      </section>;
    })}</>;
}
