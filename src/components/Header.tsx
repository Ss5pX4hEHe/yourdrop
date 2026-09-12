'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from './Store';
import { Modal } from './Modal';
import { ThemePicker } from './ThemePicker';
import { cents, rub } from '@/lib/types';

const NAV = [
  { href: '/', label: 'Кейсы' },
  { href: '/upgrade', label: 'Апгрейд' },
  { href: '/contract', label: 'Контракт' },
  { href: '/profile', label: 'Инвентарь' },
];
const QUICK = [100, 500, 1000, 5000, 10000, 100000];

export function Header() {
  const path = usePathname();
  const { state, loading, busy, act, toast } = useStore();
  const [topup, setTopup] = useState(false);
  const [reset, setReset] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!state?.pending) { setLeft(0); return; }
    const tick = () => setLeft(Math.max(0, Math.ceil((state.pending!.due - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 250); return () => clearInterval(id);
  }, [state?.pending]);

  const submitTopup = async () => {
    const n = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) { toast('Введите сумму больше нуля'); return; }
    try { await act({ type: 'topup', amount: cents(n) }); setTopup(false); toast(`${rub(cents(n))} поступят на баланс через 5 секунд`, true); } catch {}
  };
  const submitReset = async () => { try { await act({ type: 'reset' }); setReset(false); toast('Баланс сброшен до 0 ₽', true); } catch {} };

  return (
    <>
      <aside className="side-rail">
        <Link href="/" className="logo">
          <span className="mark"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 22V12m0 0 8-5m-8 5L4 7" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/></svg></span>
          <span>YOUR<em>DROP</em></span>
        </Link>
        <span className="rail-label">ИГРОВАЯ ЗОНА</span>
        <nav className="nav" aria-label="Разделы сайта">
          {NAV.map(n => <Link key={n.href} href={n.href} className={path === n.href || (n.href !== '/' && path.startsWith(n.href)) || (n.href === '/' && path.startsWith('/case/')) ? 'active' : ''}>{n.label}</Link>)}
        </nav>
        <div className="rail-bottom"><span className="rail-wordmark">YD.</span><b>Твой дроп.<br />Твои правила.</b></div>
      </aside>
      <header className="header">
      <div className="wrap">
        <div className="header-context"><span className="eyebrow">YOUR DROP</span><b>{path.startsWith('/case/') ? 'Открытие кейса' : NAV.find(n => n.href === path)?.label ?? 'Игровая зона'}</b></div>
        <div className="spacer" />
        <ThemePicker />
        <div className="wallet">
          <div className="balance">
            <b className="mono">{loading || !state ? '…' : rub(state.balance)}</b>
            {state?.pending
              ? <small className="pending-chip">+{rub(state.pending.amount)} через {left} с</small>
              : <small><span className="coins mono">{state?.coins ?? 0} BCN</span></small>}
          </div>
          <button className="btn btn-gold" onClick={() => setTopup(true)} disabled={loading || !state}><span aria-hidden="true">＋</span> Пополнить</button>
          <button className="btn btn-ghost" onClick={() => setReset(true)} disabled={loading} title="Сбросить баланс до нуля">Сброс</button>
        </div>
      </div>

      <Modal open={topup} onClose={() => setTopup(false)}>
        <h3>Пополнить баланс</h3>
        <p>Введите любую сумму. Деньги виртуальные и поступят на счёт через 5 секунд. За каждые 10 ₽ начисляется 1 BCN для бонусных кейсов.</p>
        <input className="input" aria-label="Сумма пополнения" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busy && !state?.pending) submitTopup(); }} placeholder="Сумма, ₽" autoFocus />
        <div className="chips" style={{ marginTop: 10 }}>
          {QUICK.map(q => <button key={q} className={`chip${Number(amount) === q ? ' on' : ''}`} onClick={() => setAmount(String(q))}>{rub(q * 100)}</button>)}
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setTopup(false)}>Отмена</button>
          <button className="btn btn-gold" onClick={submitTopup} disabled={busy || !!state?.pending}>{state?.pending ? 'Уже ждём зачисления' : 'Пополнить'}</button>
        </div>
      </Modal>

      <Modal open={reset} onClose={() => setReset(false)}>
        <h3>Сбросить баланс?</h3>
        <p>Баланс {state ? rub(state.balance) : ''} и {state?.coins ?? 0} BCN станут равны нулю. Предметы в инвентаре останутся. Отменить это будет нельзя.</p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setReset(false)}>Нет, оставить</button>
          <button className="btn btn-danger" onClick={submitReset} disabled={busy}>Да, сбросить до 0 ₽</button>
        </div>
      </Modal>
    </header>
    </>
  );
}
