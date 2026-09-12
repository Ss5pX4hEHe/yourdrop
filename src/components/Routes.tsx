'use client';
import Link from 'next/link';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { pct } from '@/lib/types';
import type { Route } from '@/lib/routes';

export function Routes({ routes }: { routes: Route[] }) {
  const { state, loading } = useStore();
  const acquired = new Set(state?.progress?.acquired ?? []);
  const done = routes.filter(r => r.steps.every(s => acquired.has(s.item.id))).length;
  return <><div className="page-title-row"><div><h1>Маршруты коллекции</h1><p className="lead">Пять шагов — пять конкретных скинов. Пройдите маршрут целиком и получите оформление профиля. Считается любое получение: кейс, апгрейд или контракт; продажа прогресс не стирает.</p></div><div className="collection-counter"><b>{done}<span>/{routes.length}</span></b><small>маршрутов пройдено</small></div></div>
    {loading ? <div className="skeleton" /> : routes.map(route => {
      const flags = route.steps.map(s => acquired.has(s.item.id));
      const count = flags.filter(Boolean).length, complete = count === route.steps.length;
      const current = flags.findIndex(f => !f);
      return <section key={route.id} className={'panel route' + (complete ? ' complete' : '')}>
        <div className="album-heading"><div><span className="eyebrow">{complete ? 'МАРШРУТ ПРОЙДЕН ✓' : `ШАГ ${Math.min(current + 1, 5)} ИЗ 5`}</span><h2>{route.title}</h2><p>{route.description}</p></div><strong>{count} / {route.steps.length}</strong></div>
        <progress value={count} max={route.steps.length} aria-label={'Прогресс: ' + route.title} />
        <div className="route-steps">{route.steps.map((step, i) => <div key={step.item.id} className={'route-step ' + (flags[i] ? 'done' : i === current ? 'current' : 'todo')}>
          <span className="step-no">{flags[i] ? '✓' : i + 1}</span>
          <ItemCard item={step.item} />
          <div className="route-where">{flags[i] ? 'Получен' : step.where.length ? <>Где искать: {step.where.map((w, n) => <span key={w.id}>{n ? ' · ' : ''}<Link href={'/case/' + w.id}>{w.name}</Link> ({pct(w.chance * 100)})</span>)}</> : 'Через апгрейд или контракт'}</div>
        </div>)}</div>
        <div className="route-reward"><span className={`appearance-sample ${route.reward.kind}-${route.reward.id}`} /><span>Награда: <b>{route.reward.name}</b>{complete ? ' — уже доступна в настройках витрины' : ''}</span>{complete && <Link href="/profile/showcase" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Применить</Link>}</div>
      </section>;
    })}</>;
}
