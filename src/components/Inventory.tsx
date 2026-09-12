'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { Modal } from './Modal';
import { rarityColor, rub } from '@/lib/types';
import { InventoryFilters, emptyFilter, filterInventory } from './InventoryFilters';
import { CardSizeToggle } from './CardSize';

export function Inventory() {
  const { state, lookup, loading, busy, act, toast, sendTo, showItem } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [filter, setFilter] = useState({ ...emptyFilter });
  const [limit, setLimit] = useState(60);
  const [confirmAll, setConfirmAll] = useState(false);
  const [tab, setTab] = useState<'items' | 'history'>('items');

  const { rows, invalid } = useMemo(() => filterInventory(state?.inventory ?? [], lookup, filter, state?.progress?.locked ?? []), [state, lookup, filter]);
  const available = (state?.inventory ?? []).filter(i => !state?.progress?.locked.includes(i.uid));
  const safeSel = sel.filter(uid => available.some(i => i.uid === uid));
  const sellableValue = available.reduce((sum, i) => sum + i.value, 0);
  const invValue = (state?.inventory ?? []).reduce((a, o) => a + o.value, 0);
  const selValue = safeSel.reduce((a, uid) => a + (state?.inventory.find(o => o.uid === uid)?.value ?? 0), 0);
  const toggle = (uid: string) => setSel(s => (s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]));

  const sell = async (ids: string[]) => {
    if (!ids.length) return;
    const sum = ids.reduce((a, uid) => a + (state?.inventory.find(o => o.uid === uid)?.value ?? 0), 0);
    try { await act({ type: 'sell', ids }); setSel([]); setConfirmAll(false); toast(`Продано ${ids.length} шт. за ${rub(sum)}`, true); } catch {}
  };

  return (
    <>
      <h1>Инвентарь</h1>
      <p className="lead">Выбирайте скины, отправляйте их в игру или собирайте витрину. Защита сохраняет любимые предметы от случайного использования.</p>
      <div className="prof-head">
        <div className="stat"><b className="gold mono">{state ? rub(state.balance) : '…'}</b><span>баланс</span></div>
        <div className="stat"><b className="mono">{state?.inventory.length ?? 0}</b><span>предметов</span></div>
        <div className="stat"><b className="mono">{rub(invValue)}</b><span>стоимость инвентаря</span></div>
        <div className="stat"><b className="mono">{state?.opens ?? 0}</b><span>кейсов открыто</span></div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip${tab === 'items' ? ' on' : ''}`} onClick={() => setTab('items')}>Предметы</button>
        <button className={`chip${tab === 'history' ? ' on' : ''}`} onClick={() => setTab('history')}>История</button>
      </div>

      {tab === 'items' ? (
        <div className="panel">
          <InventoryFilters value={filter} onChange={v => { setFilter(v); setLimit(60); }} inventory={state?.inventory ?? []} lookup={lookup} />
          <div className="inv-tools">
            <span className="muted">Найдено {rows.length} · выбрано {safeSel.length}</span>
            <CardSizeToggle />
            <button className="btn btn-ghost btn-sm" onClick={() => setSel(rows.filter(r => available.some(i => i.uid === r.uid)).map(r => r.uid))} disabled={!rows.length}>Выбрать найденные</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSel([])} disabled={!sel.length}>Снять</button>
            <button className="btn btn-gold" onClick={() => sell(safeSel)} disabled={!safeSel.length || busy}>Продать {safeSel.length ? `${safeSel.length} шт. за ${rub(selValue)}` : 'выбранное'}</button>
            <button className="btn btn-ghost" onClick={() => sendTo('upgrade', safeSel)} disabled={!safeSel.length || safeSel.length > 6 || busy}>В апгрейд</button>
            <button className="btn btn-ghost" onClick={() => sendTo('contract', safeSel)} disabled={!safeSel.length || safeSel.length > 10 || busy}>В контракт</button>
            <button className="btn btn-danger" onClick={() => setConfirmAll(true)} disabled={!available.length || busy}>Продать всё без защиты</button>
          </div>
          {invalid ? <div className="empty red" role="alert">Введите корректный диапазон цен: от 0, нижняя цена не больше верхней.</div> : loading ? <div className="skeleton" /> : rows.length === 0 ? (
            <div className="empty">{state?.inventory.length ? 'Ничего не найдено' : <>Пока пусто. <Link href="/">Откройте кейс</Link>, чтобы получить первые предметы.</>}</div>
          ) : (
            <><div className="item-grid inventory-grid">{rows.slice(0, limit).map(o => <ItemCard key={o.uid} item={lookup[o.id]} value={o.value} selected={safeSel.includes(o.uid)} onClick={() => { if (!state?.progress?.locked.includes(o.uid)) toggle(o.uid); else toast('Предмет защищён. Сначала снимите защиту.'); }} owned={o} locked={state?.progress?.locked.includes(o.uid)} />)}</div>{rows.length > limit && <button className="btn btn-ghost load-more" onClick={() => setLimit(n => n + 60)}>Показать ещё · осталось {rows.length - limit}</button>}</>
          )}
        </div>
      ) : (
        <div className="panel">
          {state?.history.length ? (
            <div className="history">
              {state.history.map(e => (
                <div key={e.uid} className="hist">
                  <span className="t">{new Date(e.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <div><div>{e.label}</div>
                    {e.items.length > 0 && <div className="items" style={{ marginTop: 4 }}>{e.items.slice(0, 12).map((id, i) => lookup[id] && <button key={i} aria-label={lookup[id].name} onClick={() => showItem(id)}>{lookup[id].image ? <img src={lookup[id].image} alt="" title={lookup[id].name} style={{ ['--rc' as string]: rarityColor(lookup[id].rarity) }} /> : <span>CS2</span>}</button>)}{e.items.length > 12 && <span className="muted">+{e.items.length - 12}</span>}</div>}
                  </div>
                  <span className={`d ${e.delta > 0 ? 'green' : e.delta < 0 ? 'red' : 'muted'}`}>{e.delta > 0 ? '+' : ''}{e.delta === 0 ? '—' : rub(e.delta)}</span>
                </div>
              ))}
            </div>
          ) : <div className="empty">История пуста</div>}
        </div>
      )}

      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} label="Подтверждение продажи">
        <h3>Продать предметы без защиты?</h3>
        <p>{available.length} предметов будут проданы за {rub(sellableValue)}. Защищённые останутся в инвентаре.</p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setConfirmAll(false)}>Отмена</button>
          <button className="btn btn-gold" onClick={() => sell(available.map(o => o.uid))} disabled={busy}>Продать</button>
        </div>
      </Modal>
    </>
  );
}
