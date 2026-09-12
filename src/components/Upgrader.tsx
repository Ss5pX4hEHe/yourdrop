'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { InventoryPicker } from './InventoryPicker';
import { FastControl } from './FastControl';
import { SkinImage } from './SkinImage';
import { SoundControls, useGameAudio } from './SoundControls';
import { primeAudio, scheduleTicks } from '@/lib/sound';
import { OwnedActions } from './OwnedActions';
import { cents, rub, rubF, upgradeChance } from '@/lib/types';
import { upgradePriceRange } from '@/lib/upgrade';
import type { Item, Owned } from '@/lib/types';

const R = 118, C = 2 * Math.PI * R;
const priceInput = (s: string, empty: number) => s.trim() ? Number(s.trim().replace(',', '.')) : empty;

export function Upgrader() {
  const { state, lookup, act, busy, fast, toast, transfer, clearTransfer, sound } = useStore();
  const [ids, setIds] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [target, setTarget] = useState<Item | null>(null);
  const [q, setQ] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [mode, setMode] = useState<'price' | 'chance'>('price');
  const [percent, setPercent] = useState(50);
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'win' | 'lose'>('idle');
  const [angle, setAngle] = useState(0);
  const [won, setWon] = useState<Item | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const [roundStake, setRoundStake] = useState(0);
  const [roundItems, setRoundItems] = useState<Item[]>([]);
  const [wonOwned, setWonOwned] = useState<Owned | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const needle = useRef<SVGGElement>(null);
  const currentSound = useRef(sound);
  currentSound.current = sound;

  const rawExtra = priceInput(extra, 0);
  const extraCents = Number.isFinite(rawExtra) && rawExtra >= 0 ? cents(rawExtra) : 0;
  const itemsValue = ids.reduce((a, uid) => a + (state?.inventory.find(o => o.uid === uid)?.value ?? 0), 0);
  const value = itemsValue + extraCents;
  const locked = busy || phase === 'spinning';
  const shownValue = frozen !== null ? roundStake : value;
  const stakeItems = ids.map(uid => state?.inventory.find(o => o.uid === uid)).flatMap(o => o && lookup[o.id] ? [lookup[o.id]] : []);
  const shownItems = frozen !== null ? roundItems : stakeItems;
  const priceRange = useMemo(() => upgradePriceRange(shownValue, percent), [shownValue, percent]);
  const manualMin = priceInput(min, 0), manualMax = priceInput(max, Infinity);
  const invalidRange = mode === 'price' && (!Number.isFinite(manualMin) || manualMin < 0 || (max.trim() !== '' && !Number.isFinite(manualMax)) || manualMax < 0 || manualMin > manualMax);
  const lower = mode === 'chance' ? (priceRange?.min ?? 0) / 100 : Math.max(shownValue > 0 ? (shownValue + 1) / 100 : 0, manualMin);
  const upper = mode === 'chance' ? (priceRange?.max ?? 0) / 100 : manualMax;
  const targetCents = target ? cents(target.price) : 0;
  const maximumChance = target ? upgradeChance(value, targetCents) : 0;
  const liveChance = maximumChance;
  const chance = frozen ?? liveChance;
  const mult = target && shownValue > 0 ? targetCents / shownValue : 0;
  const targetFits = !!target && target.price >= lower && target.price <= upper;
  const ready = value > 0 && !!target && targetCents > value && targetFits && !invalidRange && !searching && !searchError && Number.isFinite(rawExtra) && rawExtra >= 0 && ids.length <= 6 && extraCents <= (state?.balance ?? 0) && frozen === null && (mode !== 'chance' || maximumChance + 1e-12 >= percent / 100);
  const resetRound = () => { setPhase('idle'); setFrozen(null); setWon(null); setAngle(0); };
  const changeMode = (next: 'price' | 'chance') => { setMode(next); setTarget(null); resetRound(); };
  useGameAudio(phase, won?.rarity === 'rare');
  useLayoutEffect(() => {
    if (phase !== 'spinning' || !angle || !needle.current || currentSound.current.muted) return;
    // One detent per 12° scale mark; the needle starts at a mark, so marks sit at 12, 24, …
    const marks: number[] = [];
    for (let deg = 12; deg < angle; deg += 12) marks.push(deg);
    return scheduleTicks({ distance: angle, marks, duration: fast ? 900 : 4500, bezier: [.15, .8, .1, 1], volume: currentSound.current.volume, stop: true });
  }, [phase, angle, fast]);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('yd_upgrade') ?? 'null'); if (saved?.mode === 'chance' || saved?.mode === 'price') setMode(saved.mode); if (Number.isInteger(saved?.percent) && saved.percent >= 1 && saved.percent <= 75) setPercent(saved.percent); } catch {}
    setPreferencesReady(true);
  }, []);
  useEffect(() => { if (preferencesReady) try { localStorage.setItem('yd_upgrade', JSON.stringify({ mode, percent })); } catch {} }, [mode, percent, preferencesReady]);
  useEffect(() => {
    if (transfer?.type !== 'upgrade' || !state || locked) return;
    setIds(transfer.ids.filter(uid => state.inventory.some(i => i.uid === uid) && !state.progress?.locked.includes(uid)));
    setExtra(''); setFrozen(null); setPhase('idle'); setTarget(null); setWon(null); setAngle(0); clearTransfer();
  }, [transfer, clearTransfer, state, locked]);

  useEffect(() => {
    if (phase === 'spinning' || frozen !== null) return;
    const ctrl = new AbortController();
    if (invalidRange || (mode === 'chance' && !priceRange)) {
      setList([]); setTotal(0); setTarget(null); setSearching(false); setSearchError('');
      return;
    }
    setSearching(true); setSearchError('');
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ q, min: String(lower), sort: mode === 'chance' ? 'desc' : 'asc', limit: '60' });
        if (Number.isFinite(upper)) p.set('max', String(upper));
        const r = await fetch(`/api/items?${p}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error('Не удалось загрузить предметы');
        const data = await r.json() as { total: number; items: Item[] };
        if (ctrl.signal.aborted) return;
        setList(data.items); setTotal(data.total);
        setTarget(previous => mode === 'chance' ? data.items[0] ?? null : previous && data.items.some(i => i.id === previous.id) ? previous : null);
      } catch (e) {
        if (!ctrl.signal.aborted) { setList([]); setTotal(0); setTarget(null); setSearchError(e instanceof Error ? e.message : 'Ошибка загрузки'); }
      } finally { if (!ctrl.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, lower, upper, mode, percent, invalidRange, priceRange, phase, frozen, retry]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = async () => {
    if (!ready || !target || locked || inFlight.current) return;
    primeAudio();
    inFlight.current = true;
    setPhase('spinning'); setRoundStake(value); setRoundItems(stakeItems); setFrozen(liveChance);
    let result;
    try { result = await act({ type: 'upgrade', ids, extra: extraCents, target: target.id }); }
    catch { inFlight.current = false; resetRound(); return; }
    const success = !!result.success;
    const arc = (result.chance ?? liveChance) * 180;
    setFrozen(result.chance ?? liveChance);
    const land = success ? Math.random() * arc * 0.9 + arc * 0.05 : arc + Math.random() * (180 - arc) * 0.9 + (180 - arc) * 0.05;
    const landingAngle = Math.random() < .5 ? land : 360 - land;
    const turns = fast ? 2 : 5;
    setWon(success ? target : null);
    setWonOwned(result.items?.[0] ?? null);
    setPhase('spinning');
    setAngle(turns * 360 + landingAngle);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPhase(success ? 'win' : 'lose');
      setIds([]); setExtra(''); inFlight.current = false;
      if (success) toast(`Апгрейд удался: ${target.name}`, true);
    }, (fast ? 0.9 : 4.5) * 1000 + 100);
  };

  const dash = useMemo(() => `${C * chance / 2} ${C * (1 - chance / 2)}`, [chance]);

  return (
    <div className="upgrade-workspace">
      <section className={`upgrade-arena ${phase}`} aria-label="Розыгрыш апгрейда">
        <div className={`arena-slot ${shownValue > 0 ? 'filled' : ''}`}>
          <div className="arena-label"><span>01 / ВАША СТАВКА</span><span>{shownItems.length ? `${shownItems.length} шт.` : 'Баланс'}</span></div>
          <div className={`arena-art ${shownItems.length > 1 ? 'multiple' : ''}`}>
            {shownItems.length ? shownItems.slice(0, 3).map((it, n) => <SkinImage key={`${it.id}-${n}`} item={it} eager />) : <div className="arena-placeholder"><span>{shownValue > 0 ? '₽' : '+'}</span><small>{shownValue > 0 ? 'Ставка с баланса' : 'Выберите скин ниже'}</small></div>}
          </div>
          <div className="arena-name">{shownItems.length === 1 ? shownItems[0].name : shownItems.length ? `${shownItems.length} предметов в ставке` : shownValue > 0 ? 'Ставка готова' : 'Начнём с вашей ставки'}</div>
          <strong className="arena-price mono">{rub(shownValue)}</strong>
        </div>

      <div className="gauge-wrap sticky-upgrade">
        <div className={`gauge ${phase === 'win' ? 'win' : phase === 'lose' ? 'lose' : ''}`}>
          <svg viewBox="0 0 280 280">
            <defs>
              <linearGradient id="ug-sector" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={phase === 'lose' ? 'var(--red)' : phase === 'win' ? 'var(--green)' : 'var(--accent-dark)'} /><stop offset="1" stopColor={phase === 'lose' ? 'var(--red)' : phase === 'win' ? 'var(--green)' : 'var(--accent)'} /></linearGradient>
              <filter id="ug-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity=".7" /></filter>
            </defs>
            <circle cx="140" cy="140" r="118" fill="none" stroke="var(--line)" strokeWidth="14" />
            {[false, true].map(mirror => <circle key={String(mirror)} cx="140" cy="140" r={R} fill="none" stroke="url(#ug-sector)" strokeWidth="14" strokeDasharray={dash} transform={`${mirror ? 'translate(280 0) scale(-1 1) ' : ''}rotate(90 140 140)`} style={{ transition: 'stroke-dasharray .3s' }} />)}
            <circle cx="140" cy="140" r="104" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".6" />
            <g ref={needle} style={{ transform: `rotate(${180 + angle}deg)`, transformOrigin: '140px 140px', transition: phase === 'spinning' ? `transform ${fast ? 0.9 : 4.5}s cubic-bezier(.15,.8,.1,1)` : 'none' }}>
              <path d="M126 4 L154 4 L140 36 Z" fill="#ffffff" stroke="#0b0c11" strokeWidth="2.5" strokeLinejoin="round" filter="url(#ug-shadow)" />
              <path d="M132 8 L148 8 L140 27 Z" fill={phase === 'lose' ? 'var(--red)' : phase === 'win' ? 'var(--green)' : 'var(--accent)'} />
            </g>
          </svg>
          <div className="center">
            <b className="mono">{(chance * 100).toFixed(chance * 100 >= 10 ? 1 : 2)}%</b>
            <small>{phase === 'win' ? 'Успешный апгрейд' : phase === 'lose' ? 'Неудача' : !target ? 'выберите цель' : 'шанс успеха'}</small>
            {mult > 0 && <div className="x">×{mult.toFixed(2)}</div>}
          </div>
        </div>

        {frozen !== null && phase !== 'spinning' ? <button className="btn btn-gold btn-lg btn-block" onClick={() => { setTarget(null); resetRound(); }}>Новый апгрейд ↗</button> : <button className="btn btn-gold btn-lg btn-block" onClick={run} disabled={!ready || locked}>
          {phase === 'spinning' ? <><span className="spin" /> Крутим…</> : 'Сделать апгрейд ↗'}
        </button>}
        <FastControl disabled={locked} />
        <SoundControls />
        <div className="arena-status" role="status">
        {phase === 'win' && won && <small className="green">Предмет уже в инвентаре</small>}
        {phase === 'lose' && <small className="red">Апгрейд не удался. Ставка списана.</small>}
        {!ready && value > 0 && target && targetCents <= value && <small className="muted">Цель должна быть дороже ставки</small>}
        {!ready && value === 0 && frozen === null && <small className="muted">Выберите предметы или введите сумму</small>}
        {extraCents > (state?.balance ?? 0) && frozen === null && <small className="red">Не хватает баланса</small>}
        </div>
      </div>

        <div className={`arena-slot target ${target ? 'filled' : ''}`}>
          <div className="arena-label"><span>02 / ВАША ЦЕЛЬ</span><span>{mult > 0 ? `×${mult.toFixed(2)}` : 'Апгрейд'}</span></div>
          <div className="arena-art">{target ? <SkinImage item={target} eager /> : <div className="arena-placeholder"><span>↗</span><small>Выберите цель ниже</small></div>}</div>
          <div className="arena-name">{target?.name ?? 'Что заберёте с собой?'}</div>
          <strong className="arena-price mono">{target ? rubF(target.price) : '—'}</strong>
        </div>
      </section>
      {phase === 'win' && wonOwned && <div className={'upgrade-result-actions panel' + (won?.rarity === 'rare' ? ' rare-reveal' : '')}><strong className="green">Апгрейд удался · {won?.name}</strong><OwnedActions owned={wonOwned} /></div>}

      <div className="upgrade-pickers">
        <div inert={locked}>
          <InventoryPicker selected={ids} onChange={v => { if (locked) return; setIds(v); resetRound(); }} max={6} title="Ваши предметы" />
          <div className="panel balance-stake">
            <h3 className="panel-title">Добавить с баланса <span>доступно {rub(state?.balance ?? 0)}</span></h3>
            <input className="input" aria-label="Сумма с баланса" inputMode="decimal" placeholder="Сумма, ₽" value={extra} onChange={e => { setExtra(e.target.value); resetRound(); }} disabled={locked} />
            <div className="chips">
              {[100, 500, 1000, 5000].map(n => <button key={n} className="chip" disabled={locked} onClick={() => { setExtra(String(n)); resetRound(); }}>{rub(n * 100)}</button>)}
              <button className="chip" disabled={locked} onClick={() => { setExtra(String((state?.balance ?? 0) / 100)); resetRound(); }}>Всё</button>
            </div>
          </div>
        </div>
      <div className="panel target-panel">
        <h3 className="panel-title">Цель апгрейда <span>{searching ? 'ищем…' : `${total.toLocaleString('ru-RU')} подходящих`}</span></h3>
        <fieldset className="upgrade-mode" disabled={locked}>
          <legend className="sr-only">Способ подбора цели</legend>
          <label><input type="radio" name="upgrade-mode" checked={mode === 'price'} onChange={() => changeMode('price')} /> По цене</label>
          <label><input type="radio" name="upgrade-mode" checked={mode === 'chance'} onChange={() => changeMode('chance')} /> По шансу</label>
        </fieldset>
        {mode === 'chance' && <div className="chance-control">
          <label htmlFor="upgrade-chance">Шанс не ниже <output htmlFor="upgrade-chance">{percent}%</output></label>
          <input id="upgrade-chance" type="range" min="1" max="75" step="1" value={percent} aria-valuetext={`${percent}%`} disabled={locked} onChange={e => { setPercent(Number(e.target.value)); setTarget(null); resetRound(); }} />
          <div className="chance-scale"><span>1%</span><span>75%</span></div>
          <div className="chance-presets" aria-label="Быстрый выбор шанса">{[10, 25, 50, 75].map(n => <button className={'chip' + (percent === n ? ' on' : '')} key={n} disabled={locked} aria-pressed={percent === n} onClick={() => { setPercent(n); setTarget(null); resetRound(); }}>{n}%</button>)}</div>
          <p>{shownValue > 0 ? `Сначала ближайшие к ${percent}%, затем выше. ${target ? `Шанс выбранной цели — ${(chance * 100).toFixed(2)}%.` : 'Подбираем доступные цели.'}` : 'Выберите свой скин или добавьте сумму — рассчитаем цены и подберём цель.'}</p>
        </div>}
        <div className="filters">
          <input className="input" aria-label="Поиск цели апгрейда" placeholder="Поиск: AWP, нож, перчатки…" value={q} disabled={locked} onChange={e => { setQ(e.target.value); resetRound(); }} />
          <div className="upgrade-price-fields">
            <label>Цена от, ₽<input className="input" inputMode="decimal" placeholder="От" value={mode === 'chance' ? priceRange ? String(priceRange.min / 100) : '' : min} readOnly={mode === 'chance'} disabled={locked} aria-invalid={invalidRange} onChange={e => { setMin(e.target.value); resetRound(); }} /></label>
            <label>Цена до, ₽<input className="input" inputMode="decimal" placeholder="До" value={mode === 'chance' ? priceRange ? String(priceRange.max / 100) : '' : max} readOnly={mode === 'chance'} disabled={locked} aria-invalid={invalidRange} onChange={e => { setMax(e.target.value); resetRound(); }} /></label>
          </div>
          {mode === 'chance' && <p className="upgrade-filter-note">Цены рассчитаны по ставке и шансу. Для ввода вручную выберите «По цене».</p>}
          <button className="btn btn-ghost" disabled={locked} onClick={() => { setQ(''); setMin(''); setMax(''); setMode('price'); setTarget(null); resetRound(); }}>Сбросить фильтры</button>
        </div>
        {invalidRange ? <div className="empty red" role="alert">Введите цены от 0. Цена «от» не должна быть больше цены «до».</div> : searchError ? <div className="empty" role="alert">{searchError}<button className="btn btn-ghost" onClick={() => setRetry(n => n + 1)}>Повторить</button></div> : searching ? <div className="empty" role="status">Подбираем предметы…</div> : list.length === 0 ? <div className="empty">{mode === 'chance' ? shownValue > 0 ? 'Под этот шанс предметов нет. Передвиньте ползунок, измените ставку или поиск.' : 'Добавьте предмет или сумму с баланса.' : 'Ничего не найдено. Измените диапазон цен или поиск.'}</div> : (
          <div className="target-list" inert={locked}><div className="item-grid small">
            {list.map(it => <ItemCard key={it.id} item={it} selected={target?.id === it.id} chance={mode === 'chance' ? upgradeChance(shownValue, cents(it.price)) : undefined} onClick={() => { if (locked) return; setTarget(it); resetRound(); }} />)}
          </div></div>
        )}
      </div>
      </div>
      <div className="sticky-spacer" aria-hidden="true" />
    </div>
  );
}
