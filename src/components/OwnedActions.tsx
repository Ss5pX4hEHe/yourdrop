'use client';
import type { Owned } from '@/lib/types';
import { useStore } from './Store';
import { rub } from '@/lib/types';

export function OwnedActions({ owned }: { owned: Owned }) {
  const { state, act, busy, sendTo, toast } = useStore();
  const present = state?.inventory.some(i => i.uid === owned.uid);
  const locked = state?.progress?.locked.includes(owned.uid) ?? false;
  const shown = state?.progress?.showcase.includes(owned.uid) ?? false;
  if (!present) return <div className="item-unavailable">Предмет уже продан или использован</div>;
  const update = async (type: 'sell' | 'lock' | 'showcase') => {
    try {
      if (type === 'showcase') { const current = state?.progress?.showcase ?? []; if (!shown && current.length >= 8) { toast('На витрине можно разместить до 8 предметов'); return; } await act({ type, ids: shown ? current.filter(id => id !== owned.uid) : [...current, owned.uid] }); }
      else await act({ type, ids: [owned.uid], ...(type === 'lock' ? { locked: !locked } : {}) });
      if (type === 'sell') toast(`Продано за ${rub(owned.value)}`, true);
    } catch {}
  };
  return <div className="owned-actions">
    <button className="btn btn-ghost btn-sm" disabled={busy || locked} onClick={() => update('sell')}>Продать</button>
    <button className="btn btn-ghost btn-sm" disabled={busy || locked} onClick={() => sendTo('upgrade', [owned.uid])}>В апгрейд</button>
    <button className="btn btn-ghost btn-sm" disabled={busy || locked} onClick={() => sendTo('contract', [owned.uid])}>В контракт</button>
    <button className={'btn btn-ghost btn-sm' + (locked ? ' active-action' : '')} aria-pressed={locked} disabled={busy} onClick={() => update('lock')}>{locked ? 'Защищён ✓' : 'Защитить'}</button>
    <button className={'btn btn-ghost btn-sm' + (shown ? ' active-action' : '')} aria-pressed={shown} disabled={busy} onClick={() => update('showcase')}>{shown ? 'На витрине ★' : 'На витрину'}</button>
  </div>;
}
