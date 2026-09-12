'use client';
import { useEffect, useState } from 'react';

type Size = 'compact' | 'normal' | 'large';
const apply = (v: Size) => { document.documentElement.dataset.cards = v; };
export function CardSizeToggle() {
  const [size, setSize] = useState<Size>('normal');
  useEffect(() => { try { const saved = localStorage.getItem('yd_cards') as Size | null; if (saved === 'compact' || saved === 'large' || saved === 'normal') { setSize(saved); apply(saved); } } catch {} }, []);
  const choose = (v: Size) => { setSize(v); apply(v); try { localStorage.setItem('yd_cards', v); } catch {} };
  const icon = (n: number) => <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{Array.from({ length: n * n }, (_, i) => { const s = 14 / n, g = n > 1 ? 1.2 : 0; return <rect key={i} x={1 + (i % n) * s} y={1 + Math.floor(i / n) * s} width={s - g} height={s - g} rx="1.2" />; })}</svg>;
  return <div className="size-toggle" role="group" aria-label="Размер карточек">
    <button type="button" aria-pressed={size === 'large'} title="Крупные карточки" onClick={() => choose('large')}>{icon(1)}</button>
    <button type="button" aria-pressed={size === 'normal'} title="Обычные карточки" onClick={() => choose('normal')}>{icon(2)}</button>
    <button type="button" aria-pressed={size === 'compact'} title="Компактные карточки" onClick={() => choose('compact')}>{icon(3)}</button>
  </div>;
}
