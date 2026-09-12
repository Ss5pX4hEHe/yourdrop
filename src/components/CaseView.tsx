'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { FastControl } from './FastControl';
import { SoundControls, useGameAudio } from './SoundControls';
import { primeAudio, scheduleTicks } from '@/lib/sound';
import { cents, rub, rubF } from '@/lib/types';
import type { Case, Item, Owned } from '@/lib/types';

type Row = Item & { weight: number };
type Props = { box: Omit<Case, 'items'>; rows: Row[] };
const LEN = 64, WIN = 56;

function pick(rows: Row[]): Row {
  let cursor = Math.random();
  for (const r of rows) { cursor -= r.weight; if (cursor < 0) return r; }
  return rows[rows.length - 1];
}
function buildStrip(rows: Row[], winner: Item): Item[] {
  const strip: Item[] = [];
  for (let i = 0; i < LEN; i++) strip.push(i === WIN ? winner : pick(rows));
  return strip;
}

const EASE: [number, number, number, number] = [.1, .75, .06, 1];
function Strip({ items, vertical, spinKey, fast, onDone, audible }: { items: Item[]; vertical: boolean; spinKey: number; fast: boolean; onDone: () => void; audible: boolean }) {
  const { sound } = useStore();
  const currentSound = useRef(sound);
  currentSound.current = sound;
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = track.current; const lane = el?.parentElement; if (!el || !lane) return;
    const size = vertical ? lane.clientHeight : lane.clientWidth;
    const card = vertical ? 136 : 160, step = card + 8;
    const centerOf = (i: number) => i * step + card / 2 - size / 2;
    const set = (px: number, t: string) => { el.style.transition = t; el.style.transform = vertical ? `translate3d(0,${-px}px,0)` : `translate3d(${-px}px,0,0)`; };
    const from = centerOf(2);
    set(from, 'none');
    if (!spinKey) return;
    void el.offsetHeight;
    const jitter = (Math.random() * 0.7 - 0.35) * card;
    const dur = fast ? 900 : 6200;
    const to = centerOf(WIN) + jitter;
    let secondFrame = 0, cancelTicks = () => {};
    const raf = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(() => {
      set(to, `transform ${dur}ms cubic-bezier(${EASE.join(',')})`);
      if (audible && !currentSound.current.muted) {
        // A detent passes the pointer each time a card edge crosses the centre line.
        const marks: number[] = [];
        for (let i = 3; i <= WIN + 1; i++) { const edge = i * step - 4 - size / 2 - from; if (edge > 0 && edge < to - from) marks.push(edge); }
        cancelTicks = scheduleTicks({ distance: to - from, marks, duration: dur, bezier: EASE, volume: currentSound.current.volume, stop: true });
      }
    }); });
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(secondFrame); cancelTicks(); };
  }, [spinKey, vertical, fast, audible]);
  return (
    <div className="lane">
      <div ref={track} className={`track ${vertical ? 'v' : 'h'}`} onTransitionEnd={e => { if (e.target === track.current && e.propertyName === 'transform') onDone(); }}>
        {items.map((it, i) => <ItemCard key={i} item={it} eager details={false} />)}
      </div>
    </div>
  );
}

export function CaseView({ box, rows }: Props) {
  const { state, lookup, act, busy, fast, toast } = useStore();
  const [count, setCountState] = useState(1);
  const setCount = (n: number) => { setCountState(n); try { localStorage.setItem('yd_count', String(n)); } catch {} };
  useEffect(() => { try { const n = Number(localStorage.getItem('yd_count')); if (Number.isInteger(n) && n >= 1 && n <= 10) setCountState(n); } catch {} }, []);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [strips, setStrips] = useState<Item[][]>(() => { const byWeight = rows.slice().sort((a, b) => b.weight - a.weight); return [Array.from({ length: LEN }, (_, i) => byWeight[i % byWeight.length])]; });
  const [wins, setWins] = useState<Owned[]>([]);
  const [spinKey, setSpinKey] = useState(0);
  const finished = useRef(0);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const isBcn = box.currency === 'BCN';
  const cost = isBcn ? box.price * count : cents(box.price) * count;
  const openedCount = useRef(1);
  const funds = isBcn ? (state?.coins ?? 0) : (state?.balance ?? 0);
  const canPay = funds >= cost;
  const winSum = wins.reduce((a, w) => a + w.value, 0);
  const soldOut = wins.length > 0 && wins.every(w => !state?.inventory.some(o => o.uid === w.uid));
  const rareDrop = wins.some(w => lookup[w.id]?.rarity === 'rare');
  useGameAudio(phase, rareDrop);

  const finishAll = useCallback(() => { if (fallback.current) clearTimeout(fallback.current); setPhase('done'); }, []);
  const onLaneDone = useCallback(() => { finished.current += 1; if (finished.current >= strips.length) finishAll(); }, [strips.length, finishAll]);

  useEffect(() => () => { if (fallback.current) clearTimeout(fallback.current); }, []);

  const open = async (times = count) => {
    if (busy || phase === 'spinning' || inFlight.current) return;
    if (times !== count) setCount(times);
    primeAudio();
    if (!canPay) { toast(isBcn ? 'Недостаточно BCN — они начисляются при пополнении баланса' : 'Недостаточно средств. Пополните баланс'); return; }
    let result;
    inFlight.current = true;
    try { result = await act({ type: 'open', caseId: box.id, count: times }); } catch { return; } finally { inFlight.current = false; }
    const items = result.items ?? [];
    if (!items.length) return;
    finished.current = 0; openedCount.current = times;
    setWins(items);
    setStrips(items.map(w => buildStrip(rows, rows.find(r => r.id === w.id) ?? lookup[w.id])));
    setPhase('spinning');
    setSpinKey(k => k + 1);
    if (fallback.current) clearTimeout(fallback.current);
    fallback.current = setTimeout(finishAll, (fast ? 0.9 : 6.2) * 1000 + 600);
  };

  const sellWins = async () => {
    const ids = wins.filter(w => state?.inventory.some(o => o.uid === w.uid) && !state?.progress?.locked.includes(w.uid)).map(w => w.uid);
    if (!ids.length) return;
    const sum = wins.filter(w => ids.includes(w.uid)).reduce((total, w) => total + w.value, 0);
    try { await act({ type: 'sell', ids }); toast(`Продано за ${rub(sum)}`, true); } catch {}
  };

  const vertical = strips.length > 1;
  const odds = useMemo(() => rows, [rows]);

  return (
    <>
      <div className="case-head">
        <img src={box.image} alt="" />
        <div>
          <Link href="/" className="case-back">← Все кейсы</Link>
          <h1>{box.name}</h1>
          <div className="meta">{box.category} · <b className={isBcn ? 'bcn' : ''}>{isBcn ? `${box.price} BCN` : rubF(box.price)}</b> за кейс · {rows.length} предметов</div>
        </div>
      </div>

      <div className={`roulette ${vertical ? 'v' : 'h'}`}>
        <div className="fade" /><div className="pointer" />
        {strips.map((s, i) => <Strip key={`${spinKey}-${i}-${strips.length}`} items={s} vertical={vertical} spinKey={spinKey} fast={fast} onDone={onLaneDone} audible={i === 0} />)}
      </div>

      <div className="open-bar sticky-actions">
        <div className="count-pick" aria-label="Количество кейсов">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} className={n === count ? 'on' : ''} aria-pressed={n === count} onClick={() => setCount(n)} disabled={busy || phase === 'spinning'}>{n}</button>)}
        </div>
        <button className="btn btn-gold btn-lg" onClick={() => open()} disabled={busy || phase === 'spinning' || !state}>
          {phase === 'spinning' ? <><span className="spin" /> Открываем</> : <>Открыть {count > 1 ? `${count} шт. ` : ''}за {isBcn ? `${cost} BCN` : rub(cost)}</>}
        </button>
        <FastControl disabled={busy || phase === 'spinning'} />
        <SoundControls />
        {!canPay && state && phase !== 'spinning' && <span className="muted">Не хватает {isBcn ? `${cost - funds} BCN` : rub(cost - funds)}</span>}
      </div>

      {phase === 'done' && wins.length > 0 && (
        <div className={'win-bar' + (rareDrop ? ' rare-reveal' : '')}>
          {rareDrop && <div className="rare-announcement">Редкий дроп · ваша коллекция стала ярче</div>}
          <div className="item-grid small" style={{ flex: '1 1 320px' }}>
            {wins.map(w => lookup[w.id] && <ItemCard key={w.uid} item={lookup[w.id]} value={w.value} owned={w} locked={state?.progress?.locked.includes(w.uid)} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <div className="sum">Выпало на <b>{rub(winSum)}</b></div>
            <button className="btn btn-gold" onClick={() => open(openedCount.current)} disabled={busy || !state}>Повторить · {openedCount.current} шт. за {isBcn ? `${box.price * openedCount.current} BCN` : rub(cents(box.price) * openedCount.current)}</button>
            <button className="btn btn-violet" onClick={sellWins} disabled={busy || soldOut || !wins.some(w => state?.inventory.some(i => i.uid === w.uid) && !state?.progress?.locked.includes(w.uid))}>{soldOut ? 'Предметы использованы' : 'Продать доступные'}</button>
            <Link href="/profile" className="btn btn-ghost">В инвентарь</Link>
          </div>
        </div>
      )}

      <section className="odds">
        <h2 className="panel-title" style={{ fontSize: 20 }}>Содержимое кейса</h2>
        <div className="item-grid">
          {odds.map(r => <ItemCard key={r.id} item={r} />)}
        </div>
      </section>
      <div className="sticky-spacer" aria-hidden="true" />
    </>
  );
}
