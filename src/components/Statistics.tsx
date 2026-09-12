'use client';
import { useState } from 'react';
import { useStore } from './Store';
import { ItemCard } from './ItemCard';
import { Modal } from './Modal';
import { rub } from '@/lib/types';

export function Statistics() {
  const { state, lookup, loading, sessionAt, act, busy, toast } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const resetAll = async () => {
    if (!confirmed || busy) return;
    try {
      await act({ type: 'resetAll', confirmReset: true });
      setResetOpen(false); setConfirmed(false); setPeriod('session');
      toast('Весь прогресс сброшен. Можно начать заново.', true);
    } catch {}
  };
  const [period, setPeriod] = useState<'session' | 'week' | 'all'>('session');
  const stats = state?.progress?.stats;
  const rounds = stats?.rounds.filter(r => period === 'all' || r.at >= (period === 'session' ? sessionAt : Date.now() - 7 * 86400000)) ?? [];
  let cumulative = 0;
  const values = [0, ...rounds.map(r => (cumulative += r.delta))];
  const min = Math.min(0, ...values), max = Math.max(0, ...values), spread = Math.max(100, max - min);
  const x = (index: number) => 50 + index / Math.max(1, values.length - 1) * 640;
  const y = (value: number) => 25 + (max - value) / spread * 180;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const net = stats ? stats.caseReturn - stats.caseSpent + stats.upgradeReturn - stats.upgradeSpent + stats.contractReturn - stats.contractSpent : 0;
  const kinds: Record<string, string> = { case: 'Открытие кейса', upgrade: 'Апгрейд', contract: 'Контракт' };
  return <><h1>Личная статистика</h1><p className="lead">Стоимость полученных предметов и результат ваших розыгрышей. Пополнения и продажи не увеличивают игровой результат.</p>
    {loading || !stats ? <div className="empty">{loading ? 'Загружаем статистику…' : 'Статистика пока недоступна. Обновите страницу.'}</div> : <>
      <div className="stats-grid">
        <div className="stat panel"><span>Потрачено на кейсы</span><b>{rub(stats.caseSpent)}</b><small>{stats.caseOpens} открытий в статистике</small></div>
        <div className="stat panel"><span>Выпало из кейсов</span><b>{rub(stats.caseReturn)}</b><small>{stats.caseSpent ? `${(stats.caseReturn / stats.caseSpent * 100).toFixed(1)}% от стоимости открытий` : 'Пока без открытий'}</small></div>
        <div className="stat panel"><span>Успешные апгрейды</span><b>{stats.upgradeAttempts ? `${(stats.upgradeWins / stats.upgradeAttempts * 100).toFixed(1)}%` : '—'}</b><small>{stats.upgradeWins} из {stats.upgradeAttempts} попыток</small></div>
        <div className="stat panel"><span>Общий игровой результат</span><b className={net >= 0 ? 'green' : 'red'}>{net > 0 ? '+' : ''}{rub(net)}</b><small>Кейсы + апгрейды + контракты</small></div>
      </div>
      <div className="stats-layout"><section className="panel chart-panel"><div className="panel-title">Динамика результата <span className={cumulative >= 0 ? 'green' : 'red'}>{cumulative > 0 ? '+' : ''}{rub(cumulative)}</span></div><div className="chips" aria-label="Период графика">{([['session', 'Эта сессия'], ['week', '7 дней'], ['all', 'Последние 200']] as const).map(([key, label]) => <button key={key} className={'chip' + (period === key ? ' on' : '')} aria-pressed={period === key} onClick={() => setPeriod(key)}>{label}</button>)}</div>
        {!rounds.length ? <div className="chart-empty">В выбранном периоде ещё нет розыгрышей.</div> : <><div className="result-chart"><svg viewBox="0 0 740 245" role="img" aria-label={`Накопленный результат ${rounds.length} розыгрышей: ${rub(cumulative)}`}><title>Изменение игрового результата</title><line x1="50" y1={y(0)} x2="690" y2={y(0)} stroke="var(--line-2)" strokeDasharray="4 4" /><text x="50" y="15" fill="var(--muted)" fontSize="12">{rub(max)}</text><text x="50" y="232" fill="var(--muted)" fontSize="12">{rub(min)}</text><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{values.map((v, i) => i > 0 && <circle key={i} cx={x(i)} cy={y(v)} r={values.length > 40 ? 2 : 4} fill="var(--accent)"><title>{new Date(rounds[i - 1].at).toLocaleString('ru-RU')} · {kinds[rounds[i - 1].kind]} · результат {rub(v)}</title></circle>)}</svg></div><p className="chart-caption">{rounds.length} розыгрышей · сохраняются последние 200 точек. Счётчики сверху учитывают все розыгрыши с начала сбора статистики.</p><details className="chart-table"><summary>Последние действия в числах</summary><table><thead><tr><th>Действие</th><th>Время</th><th>Результат</th></tr></thead><tbody>{rounds.slice(-10).reverse().map((r, i) => <tr key={i}><td>{kinds[r.kind]}</td><td>{new Date(r.at).toLocaleTimeString('ru-RU')}</td><td className={r.delta >= 0 ? 'green' : 'red'}>{r.delta > 0 ? '+' : ''}{rub(r.delta)}</td></tr>)}</tbody></table></details></>}
      </section><section className="panel best-drop"><h2 className="panel-title">Лучший полученный предмет</h2>{stats.bestDrop && lookup[stats.bestDrop.id] ? <ItemCard item={lookup[stats.bestDrop.id]} value={stats.bestDrop.value} /> : <div className="empty">Ваш лучший дроп ещё впереди.</div>}<div className="stats-breakdown"><span>Стоимость ставок в апгрейде<b>{rub(stats.upgradeSpent)}</b></span><span>Получено в апгрейдах<b>{rub(stats.upgradeReturn)}</b></span><span>Результат контрактов<b>{rub(stats.contractReturn - stats.contractSpent)}</b></span></div></section></div>
      <p className="stats-footnote">Статистика ведётся с {new Date(stats.since).toLocaleString('ru-RU')}. Старые открытия до этой даты не пересчитываются. Бонусные кейсы учитываются по курсу 1 BCN = 0,10 ₽. Сброс баланса не стирает статистику.</p>
      <section className="reset-progress"><div><h2>Начать с чистого листа</h2><p>Удалить баланс, предметы, историю, статистику, коллекции и достижения. Вернуть настройки к первоначальным.</p></div><button className="btn btn-danger" disabled={busy} onClick={() => { setConfirmed(false); setResetOpen(true); }}>Сбросить весь прогресс</button></section>
    </>}
    <Modal open={resetOpen} onClose={() => { if (!busy) setResetOpen(false); }} label="Полный сброс прогресса">
      <h3>Точно начать всё заново?</h3>
      <p>Будут удалены баланс и BCN, все предметы, включая защищённые, история, статистика, достижения, коллекции и витрина. Ожидающее пополнение отменится. Тема, звук и быстрый прокрут вернутся к начальным настройкам.</p>
      <p>Восстановить этот прогресс будет нельзя.</p>
      <label className="reset-check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Я понимаю, что удаляю весь свой прогресс.</label>
      <div className="actions"><button className="btn btn-ghost" disabled={busy} onClick={() => setResetOpen(false)}>Оставить прогресс</button><button className="btn btn-danger" disabled={busy || !confirmed} onClick={resetAll}>{busy ? 'Сбрасываем…' : 'Да, начать заново'}</button></div>
    </Modal>
  </>;
}
