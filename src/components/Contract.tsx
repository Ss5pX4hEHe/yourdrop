'use client';
import { useEffect, useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { InventoryPicker } from './InventoryPicker';
import { rarityColor, rub } from '@/lib/types';
import type { Owned } from '@/lib/types';
import { SkinImage } from './SkinImage';

export function Contract() {
  const { state, lookup, act, busy, toast, transfer, clearTransfer } = useStore();
  const [ids, setIds] = useState<string[]>([]);
  const [result, setResult] = useState<Owned | null>(null);
  const [poolCount, setPoolCount] = useState<number | null>(null);
  const owned = ids.map(uid => state?.inventory.find(o => o.uid === uid)).filter(Boolean) as { uid: string; id: number; value: number }[];
  const sum = owned.reduce((a, o) => a + o.value, 0);
  const min = sum * 0.5, max = sum * 1.5;
  useEffect(() => { if (transfer?.type !== 'contract' || !state || busy) return; setIds(transfer.ids.filter(uid => state.inventory.some(i => i.uid === uid) && !state.progress?.locked.includes(uid))); setResult(null); clearTransfer(); }, [transfer, clearTransfer, state, busy]);

  useEffect(() => {
    if (sum <= 0) { setPoolCount(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try { const r = await fetch(`/api/items?min=${min / 100}&max=${max / 100}&limit=1`, { signal: ctrl.signal }); setPoolCount(((await r.json()) as { total: number }).total); } catch {}
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [sum, min, max]);

  const run = async () => {
    if (ids.length < 3 || busy) return;
    try {
      const r = await act({ type: 'contract', ids });
      const w = r.items?.[0];
      if (w) { setResult(w); toast('Контракт выполнен. Предмет добавлен в инвентарь', true); }
      setIds([]);
    } catch {}
  };

  return (
    <div className="ct-layout">
      <div inert={busy}><InventoryPicker selected={ids} onChange={v => { setIds(v); setResult(null); }} max={10} title="Предметы для контракта" /></div>
      <div className="panel">
        <h3 className="panel-title">Контракт <span>{ids.length} из 10</span></h3>
        <div className="slots">
          {Array.from({ length: 10 }, (_, i) => {
            const o = owned[i]; const it = o && lookup[o.id];
            return it ? <div key={o.uid} className="slot full" style={{ ['--rc' as string]: rarityColor(it.rarity) }} title={it.name}><SkinImage item={it} /></div> : <div key={i} className="slot">{i + 1}</div>;
          })}
        </div>
        <div className="stake-total"><span>Сумма контракта</span><span className="gold mono">{rub(sum)}</span></div>
        <div className="range-bar"><span>Получите от <b>{rub(Math.floor(min))}</b></span><span>до <b>{rub(Math.ceil(max))}</b></span></div>
        {poolCount !== null && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{poolCount ? `В этом диапазоне ${poolCount.toLocaleString('ru-RU')} предметов` : 'В этом диапазоне нет предметов — измените состав'}</div>}
        {result ? (
          <div className="reveal"><div style={{ textAlign: 'center' }}>
            {lookup[result.id] && <ItemCard item={lookup[result.id]} value={result.value} owned={result} />}
            <div className="green" style={{ marginTop: 10, fontWeight: 700 }}>Добавлен в инвентарь</div>
          </div></div>
        ) : (
          <button className="btn btn-violet btn-lg btn-block" onClick={run} disabled={ids.length < 3 || busy || poolCount === 0}>
            {busy ? <><span className="spin" /> Заключаем</> : ids.length < 3 ? `Выберите ещё ${3 - ids.length}` : 'Заключить контракт'}
          </button>
        )}
        {result && <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setResult(null)}>Новый контракт</button>}
      </div>
    </div>
  );
}
