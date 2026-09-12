'use client';
import { useStore } from './Store';

export function FastControl({ disabled = false }: { disabled?: boolean }) {
  const { fast, setFast } = useStore();
  return <label className={'local-fast' + (fast ? ' enabled' : '')}>
    <input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)} disabled={disabled} />
    <span className="switch-track" aria-hidden="true"><span /></span>
    <span><b>Быстрая прокрутка</b><small>{fast ? 'Включена · около 1 секунды' : 'Выключена · полная анимация'}</small></span>
  </label>;
}
