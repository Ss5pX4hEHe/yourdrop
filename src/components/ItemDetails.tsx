'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from './Modal';
import { SkinImage } from './SkinImage';
import { OwnedActions } from './OwnedActions';
import { useStore } from './Store';
import { RARITY, rubF, type Item, type CaseLite } from '@/lib/types';

type Details = { item: Item; cases: (CaseLite & { chance: number })[]; sourceDate: string };
export function ItemDetails({ id, uid, onClose }: { id: number | null; uid?: string; onClose: () => void }) {
  const { state } = useStore();
  const [data, setData] = useState<Details | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    setData(null); setError(''); if (id === null) return;
    const controller = new AbortController();
    fetch('/api/items/' + id, { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error('Не удалось загрузить предмет'); return r.json(); }).then(result => { if (!controller.signal.aborted) setData(result); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id, retry]);
  const owned = state?.inventory.find(o => uid ? o.uid === uid && o.id === id : o.id === id);
  return <Modal open={id !== null} onClose={onClose} label="Карточка предмета" wide>
    <div className="detail-toolbar"><span className="eyebrow">КАРТОЧКА ПРЕДМЕТА</span><button className="btn btn-ghost btn-sm" onClick={onClose}>Закрыть ×</button></div>
    {error ? <div className="empty" role="alert">{error}<button className="btn btn-ghost" onClick={() => setRetry(n => n + 1)}>Повторить</button></div> : !data ? <div className="empty" role="status">Загружаем предмет…</div> : <>
      <div className="skin-detail"><div className="detail-art" style={{ '--rc': RARITY[data.item.rarity].color } as React.CSSProperties}><SkinImage item={data.item} eager /></div><div>
        <span className="detail-rarity" style={{ color: RARITY[data.item.rarity].color }}>{RARITY[data.item.rarity].label}</span><h2>{data.item.name}</h2><strong className="detail-price">{rubF(data.item.price)}</strong>
        <dl><dt>Оружие / тип</dt><dd>{data.item.weapon || (data.item.type === 'bonus' ? 'Бонус' : 'Предмет')}</dd><dt>Расцветка</dt><dd>{data.item.finish || 'Стандартная'}</dd><dt>В инвентаре</dt><dd>{state?.inventory.filter(o => o.id === id).length ?? 0} шт.</dd></dl>
        <p className="muted detail-note">Цена каталога на {data.sourceDate}.</p>
      </div></div>
      {owned && <OwnedActions owned={owned} />}
      <h3 className="detail-cases-title">Где выпадает <span className="muted">· {data.cases.length}</span></h3>
      {data.cases.length ? <div className="detail-cases">{data.cases.map(c => <Link key={c.id} href={'/case/' + c.id} onClick={onClose}><img src={c.image} alt="" loading="lazy" /><div><b>{c.name}</b><small>{c.currency === 'BCN' ? `${c.price} BCN` : rubF(c.price)}</small></div><span>↗</span></Link>)}</div> : <p className="muted">В текущих кейсах не встречается. Доступен в каталоге апгрейда.</p>}
    </>}
  </Modal>;
}
