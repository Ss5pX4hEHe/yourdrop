'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { AppearancePicker } from './Achievements';
import { ACHIEVEMENTS } from '@/lib/rewards';
import { rub } from '@/lib/types';
import { ShareSettings } from './ShareSettings';

export function Showcase() {
  const { state, lookup, busy, loading, act, toast } = useStore();
  const [editing, setEditing] = useState(false), [title, setTitle] = useState(''), [query, setQuery] = useState(''), [limit, setLimit] = useState(48);
  const p = state?.progress;
  useEffect(() => { setTitle(p?.title ?? 'Моя коллекция'); }, [p?.title]);
  const selected = p?.showcase ?? [];
  const displayed = selected.flatMap(uid => { const owned = state?.inventory.find(o => o.uid === uid); return owned && lookup[owned.id] ? [owned] : []; });
  const available = state?.inventory.filter(o => lookup[o.id]?.name.toLowerCase().includes(query.toLowerCase())) ?? [];
  const update = async (ids: string[]) => { if (ids.length > 8) { toast('Выберите до 8 предметов'); return; } try { await act({ type: 'showcase', ids }); } catch {} };
  const move = (index: number, direction: number) => { const ids = [...selected]; [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]; void update(ids); };
  return <><div className="page-title-row"><div><h1>Витрина</h1><p className="lead">Восемь мест для любимых скинов. Выбирайте предметы, меняйте их порядок и оформление.</p></div><button className="btn btn-gold" disabled={!state} onClick={() => setEditing(v => !v)}>{editing ? 'Готово' : 'Настроить витрину'}</button></div>
    <section className={`showcase-stage background-${p?.background ?? 'carbon'} frame-${p?.frame ?? 'plain'}`}>
      <div className="showcase-heading"><div className="profile-monogram">YD</div><div><span className="eyebrow">YOUR DROP / ЛИЧНАЯ ВИТРИНА</span><h2>{p?.title ?? 'Моя коллекция'}</h2><div className="showcase-badges">{ACHIEVEMENTS.filter(a => p?.achievements.includes(a.id)).map(a => <span key={a.id} title={a.name} aria-label={a.name}>{a.badge}</span>)}</div></div><div className="showcase-total"><strong>{rub(displayed.reduce((sum, i) => sum + i.value, 0))}</strong><small>стоимость на витрине</small></div></div>
      {loading ? <div className="skeleton" /> : !displayed.length ? <div className="showcase-empty"><b>Здесь будет ваша лучшая коллекция</b><p>Нажмите «Настроить витрину» или «На витрину» на карточке скина.</p>{!state?.inventory.length && <Link href="/" className="btn btn-ghost">Выбрать кейс</Link>}</div> : <div className="showcase-grid">{displayed.map((o, index) => <div key={o.uid} className="showcase-piece"><span className="showcase-position">{String(index + 1).padStart(2, '0')}</span><ItemCard item={lookup[o.id]} value={o.value} ownedUid={o.uid} locked={p?.locked.includes(o.uid)} />{editing && <div className="showcase-reorder"><button className="btn btn-ghost btn-sm" aria-label="Переместить раньше" disabled={busy || index === 0} onClick={() => move(index, -1)}>←</button><button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => update(selected.filter(uid => uid !== o.uid))}>Убрать</button><button className="btn btn-ghost btn-sm" aria-label="Переместить дальше" disabled={busy || index === displayed.length - 1} onClick={() => move(index, 1)}>→</button></div>}</div>)}</div>}
    </section>
    {editing && <section className="panel showcase-editor"><h2>Настройки витрины</h2><div className="showcase-name"><label>Название<input className="input" maxLength={48} value={title} onChange={e => setTitle(e.target.value)} /></label><button className="btn btn-ghost" disabled={busy || !title.trim()} onClick={async () => { try { await act({ type: 'showcase', ids: selected, title }); toast('Название сохранено', true); } catch {} }}>Сохранить название</button></div><AppearancePicker />
      <ShareSettings />
      <div className="panel-title" style={{ marginTop: 24 }}>Выберите предметы <span>{selected.length} из 8</span></div><input className="input" aria-label="Поиск предметов для витрины" placeholder="Поиск по инвентарю" value={query} onChange={e => { setQuery(e.target.value); setLimit(48); }} />
      {available.length ? <><div className="item-grid showcase-picker" inert={busy}>{available.slice(0, limit).map(o => <ItemCard key={o.uid} item={lookup[o.id]} value={o.value} ownedUid={o.uid} selected={selected.includes(o.uid)} onClick={() => update(selected.includes(o.uid) ? selected.filter(id => id !== o.uid) : [...selected, o.uid])} />)}</div>{available.length > limit && <button className="btn btn-ghost load-more" onClick={() => setLimit(n => n + 48)}>Показать ещё</button>}</> : <div className="empty">{state?.inventory.length ? 'Ничего не найдено' : 'Сначала получите предметы из кейсов или апгрейда.'}</div>}
    </section>}
  </>;
}
