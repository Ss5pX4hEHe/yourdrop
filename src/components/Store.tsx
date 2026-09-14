'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Action, ApiResponse, Lookup, Result, State } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ItemDetails } from './ItemDetails';
import { ACHIEVEMENTS, ROUTE_TITLES } from '@/lib/rewards';
import { setAudioMuted } from '@/lib/sound';

type Ctx = {
  state: State | null;
  lookup: Lookup;
  loading: boolean;
  busy: boolean;
  fast: boolean;
  setFast: (v: boolean) => void;
  act: (action: Omit<Action, 'requestId'>) => Promise<Result>;
  refresh: () => Promise<void>;
  toast: (text: string, ok?: boolean) => void;
  showItem: (id: number | null, uid?: string) => void;
  transfer: { type: 'upgrade' | 'contract'; ids: string[] } | null;
  sendTo: (type: 'upgrade' | 'contract', ids: string[]) => void;
  clearTransfer: () => void;
  sound: { muted: boolean; volume: number };
  setSound: (value: { muted: boolean; volume: number }) => void;
  sessionAt: number;
};

// Some in-app browsers (Telegram, Yandex, old Android WebView) lack crypto.randomUUID.
function makeId() {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes); else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => { const c = useContext(StoreCtx); if (!c) throw new Error('StoreProvider missing'); return c; };

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [lookup, setLookup] = useState<Lookup>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fast, setFastState] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string; ok: boolean }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const stateEpoch = useRef(0);
  const sessionAt = useRef(Date.now()).current;
  const actionPending = useRef(false);
  const [detail, setDetail] = useState<{ id: number; uid?: string } | null>(null);
  const showItem = useCallback((id: number | null, uid?: string) => setDetail(id === null ? null : { id, uid }), []);
  const [transfer, setTransfer] = useState<Ctx['transfer']>(null);
  const clearTransfer = useCallback(() => setTransfer(null), []);
  const [sound, setSoundState] = useState({ muted: false, volume: .25 });
  useEffect(() => setAudioMuted(sound.muted || !sound.volume), [sound.muted, sound.volume]);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem('yd_sound') ?? 'null'); if (saved && typeof saved.muted === 'boolean' && Number.isFinite(saved.volume)) setSoundState({ muted: saved.muted, volume: Math.max(0, Math.min(1, saved.volume)) }); } catch {} }, []);
  const setSound = useCallback((value: { muted: boolean; volume: number }) => { setSoundState(value); try { localStorage.setItem('yd_sound', JSON.stringify(value)); } catch {} }, []);

  useEffect(() => { try { setFastState(localStorage.getItem('yd_fast') === '1'); } catch {} }, []);
  const setFast = useCallback((v: boolean) => { setFastState(v); try { localStorage.setItem('yd_fast', v ? '1' : '0'); } catch {} }, []);

  const toast = useCallback((text: string, ok = false) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-3), { id, text, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  const apply = useCallback((data: ApiResponse) => {
    setState(data.state);
    setLookup(prev => ({ ...prev, ...data.lookup }));
  }, []);

  const refresh = useCallback(async () => {
    if (actionPending.current) return;
    const epoch = stateEpoch.current;
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      const data = await r.json() as ApiResponse;
      if (!r.ok) throw new Error(data.error || 'Ошибка загрузки');
      if (epoch === stateEpoch.current && !actionPending.current) apply(data);
    } catch (e) { toast(e instanceof Error ? e.message : 'Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [apply, toast]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { try { if (document.documentElement.dataset.perf === 'lite' && document.documentElement.dataset.perfMode === 'auto' && !localStorage.getItem('yd_perf_notice')) { localStorage.setItem('yd_perf_notice', '1'); setTimeout(() => toast('Включён лёгкий режим для телефона: без тяжёлых эффектов, чтобы не тормозило. Изменить можно в меню «Тема»', true), 1200); } } catch {} }, [toast]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (state?.pending) {
      const wait = Math.max(0, state.pending.due - Date.now()) + 250;
      timer.current = setTimeout(() => { refresh(); }, wait);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state?.pending, refresh]);

  const act = useCallback(async (action: Omit<Action, 'requestId'>): Promise<Result> => {
    if (actionPending.current) throw new Error('Дождитесь завершения текущего действия');
    actionPending.current = true;
    stateEpoch.current++;
    setBusy(true);
    try {
      const r = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, requestId: makeId() }) });
      const data = await r.json() as ApiResponse;
      if (!r.ok) throw new Error(data.error || 'Ошибка действия');
      apply(data);
      if (action.type === 'resetAll') {
        setLookup(data.lookup); setTransfer(null); setDetail(null); setToasts([]);
        if (timer.current) clearTimeout(timer.current);
        for (const pending of rewardTimers.current) clearTimeout(pending);
        rewardTimers.current.clear();
        setFastState(false); setSoundState({ muted: false, volume: .25 });
        try { for (const key of ['yd_fast', 'yd_sound', 'yd_theme', 'yd_custom_theme', 'yd_fx', 'yd_upgrade', 'yd_count', 'yd_cards', 'yd_perf', 'yd_perf_notice']) localStorage.removeItem(key); } catch {}
        document.documentElement.dataset.theme = 'amethyst'; delete document.documentElement.dataset.cards;
        window.dispatchEvent(new Event('yd-reset'));
      }
      const earned = data.state.progress?.achievements.filter(id => !state?.progress?.achievements.includes(id)) ?? [];
      if (earned.length) {
        const names = earned.map(id => id.startsWith('route:') ? 'маршрут «' + (ROUTE_TITLES[id.slice(6)] ?? id) + '» пройден' : ACHIEVEMENTS.find(a => a.id === id)?.name).filter(Boolean);
        const message = 'Достижение: ' + names.join(', ');
        if (action.type === 'open' || action.type === 'upgrade') {
          const pending = setTimeout(() => { rewardTimers.current.delete(pending); toast(message, true); }, fast ? 1300 : action.type === 'open' ? 6800 : 5000);
          rewardTimers.current.add(pending);
        } else toast(message, true);
      }
      return data.result;
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Ошибка действия';
      toast(text);
      throw e;
    } finally { setBusy(false); actionPending.current = false; }
  }, [apply, toast, state?.progress?.achievements, fast]);

  useEffect(() => () => { for (const pending of rewardTimers.current) clearTimeout(pending); }, []);

  const sendTo = useCallback((type: 'upgrade' | 'contract', ids: string[]) => {
    const limit = type === 'upgrade' ? 6 : 10;
    const available = ids.filter(uid => state?.inventory.some(o => o.uid === uid) && !state.progress?.locked.includes(uid));
    if (!available.length) { toast('Выберите доступный предмет без защиты'); return; }
    if (available.length > limit) { toast(`Можно передать не больше ${limit} предметов`); return; }
    setTransfer({ type, ids: available }); showItem(null); router.push('/' + type);
  }, [router, state, toast]);

  const value = useMemo(() => ({ state, lookup, loading, busy, fast, setFast, act, refresh, toast, showItem, transfer, sendTo, clearTransfer, sound, setSound, sessionAt }), [state, lookup, loading, busy, fast, setFast, act, refresh, toast, transfer, sendTo, clearTransfer, sound, setSound, sessionAt]);

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <ItemDetails id={detail?.id ?? null} uid={detail?.uid} onClose={() => showItem(null)} />
      <div className="toasts" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast${t.ok ? ' ok' : ''}`}>{t.text}</div>)}
      </div>
    </StoreCtx.Provider>
  );
}
