'use client';
import { useMemo, useState } from 'react';
import { usePerf } from '@/lib/perf';
import Link from 'next/link';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { rub } from '@/lib/types';

type Props = { selected: string[]; onChange: (uids: string[]) => void; max: number; title?: string };

export function InventoryPicker({ selected, onChange, max, title = 'Ваш инвентарь' }: Props) {
  const perf = usePerf();
  const [shownCount, setShownCount] = useState(40);
  const { state, lookup, loading, toast } = useStore();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const rows = useMemo(() => {
    const list = (state?.inventory ?? []).filter(o => lookup[o.id] && (!q || lookup[o.id].name.toLowerCase().includes(q.toLowerCase())));
    return list.sort((a, b) => (sort === 'desc' ? b.value - a.value : a.value - b.value));
  }, [state, lookup, q, sort]);
  const total = selected.reduce((a, uid) => a + (state?.inventory.find(o => o.uid === uid)?.value ?? 0), 0);
  const toggle = (uid: string) => {
    if (state?.progress?.locked.includes(uid)) { toast('Сначала снимите защиту с предмета в инвентаре'); return; }
    if (selected.includes(uid)) onChange(selected.filter(u => u !== uid));
    else if (selected.length >= max) toast(`Можно выбрать не больше ${max} предметов`);
    else onChange([...selected, uid]);
  };
  return (
    <div className="panel">
      <h3 className="panel-title">{title} <span>{state?.inventory.length ?? 0} шт.</span></h3>
      <div className="filters">
        <div className="row">
          <input className="input" aria-label="Поиск в инвентаре" placeholder="Поиск по названию" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn btn-ghost" onClick={() => setSort(s => (s === 'desc' ? 'asc' : 'desc'))}>{sort === 'desc' ? 'Дорогие ↓' : 'Дешёвые ↑'}</button>
        </div>
      </div>
      <div className="sel-summary"><span>Выбрано <b>{selected.length}</b> из {max}</span><span>на сумму <b>{rub(total)}</b></span>{selected.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => onChange([])}>Снять</button>}</div>
      {loading ? <div className="skeleton" /> : rows.length === 0 ? (
        <div className="empty">{state?.inventory.length ? 'Ничего не найдено' : <>Инвентарь пуст. <Link href="/">Откройте кейс</Link>, чтобы получить предметы.</>}</div>
      ) : (
        <div className="picker-box"><div className="item-grid small">
          {(perf === 'lite' ? rows.slice(0, shownCount) : rows).map(o => <ItemCard key={o.uid} item={lookup[o.id]} value={o.value} ownedUid={o.uid} selected={selected.includes(o.uid)} onClick={() => toggle(o.uid)} locked={state?.progress?.locked.includes(o.uid)} />)}
        </div>{perf === 'lite' && rows.length > shownCount && <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setShownCount(c => c + 40)}>Показать ещё ({rows.length - shownCount})</button>}</div>
      )}
    </div>
  );
}
