'use client';
import { useStore } from './Store';
import { ACHIEVEMENTS, FRAMES, BACKGROUNDS } from '@/lib/rewards';

export function AppearancePicker() {
  const { state, busy, act, toast } = useStore();
  const p = state?.progress;
  const change = async (key: 'frame' | 'background', value: string) => { try { await act({ type: 'appearance', [key]: value }); toast('Оформление сохранено', true); } catch {} };
  return <div className="appearance-picker">{([['frame', 'Рамка профиля', FRAMES], ['background', 'Фон витрины', BACKGROUNDS]] as const).map(([key, title, options]) => <fieldset key={key}><legend>{title}</legend><div className="appearance-options">{options.map(o => {
    const unlocked = !o.requires || p?.achievements.includes(o.requires);
    return <button key={o.id} className={`appearance-option ${key}-${o.id} ${p?.[key] === o.id ? 'chosen' : ''}`} disabled={busy || !state || !unlocked} title={unlocked ? o.name : o.requires.startsWith('route:') ? 'Награда за маршрут коллекции' : 'Награда за достижение: ' + ACHIEVEMENTS.find(a => a.id === o.requires)?.name} aria-pressed={p?.[key] === o.id} onClick={() => change(key, o.id)}><span className="appearance-sample" /><b>{o.name}</b><small>{unlocked ? p?.[key] === o.id ? 'Выбрано ✓' : 'Доступно' : 'Закрыто'}</small></button>;
  })}</div></fieldset>)}</div>;
}

export function Achievements() {
  const { state, loading } = useStore();
  const unlocked = (state?.progress?.achievements ?? []).filter(id => ACHIEVEMENTS.some(a => a.id === id));
  return <><div className="page-title-row"><div><h1>Достижения</h1><p className="lead">Значки за вашу коллекцию. Каждое достижение открывает оформление профиля или витрины.</p></div><div className="collection-counter"><b>{unlocked.length}<span>/{ACHIEVEMENTS.length}</span></b><small>достижений открыто</small></div></div>
    {loading ? <div className="skeleton" /> : <div className="achievement-grid">{ACHIEVEMENTS.map(a => <article key={a.id} className={'achievement-card panel' + (unlocked.includes(a.id) ? ' earned' : '')}><div className="achievement-badge" aria-hidden="true">{a.badge}</div><div><span className="eyebrow">{unlocked.includes(a.id) ? 'ПОЛУЧЕНО ✓' : 'ЕЩЁ ВПЕРЕДИ'}</span><h2>{a.name}</h2><p>{a.description}</p><small>Награда: {a.reward}</small>{a.id === 'collector' && !unlocked.includes(a.id) && <progress value={Math.min(10, state?.progress?.acquired.length ?? 0)} max={10} aria-label="Получено разных предметов из 10" />}{a.id === 'hundred' && !unlocked.includes(a.id) && <progress value={Math.min(100, state?.opens ?? 0)} max={100} aria-label="Открыто кейсов из 100" />}</div></article>)}</div>}
    <section className="panel appearance-section"><h2>Ваше оформление</h2><p className="muted">Выбранные рамка и фон появятся на витрине.</p><AppearancePicker /></section>
  </>;
}
