'use client';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from './Store';
import { Modal } from './Modal';

type Sess = { id: string; label: string; created: number; lastSeen: number; current: boolean };
const when = (t: number) => { const d = Date.now() - t; if (d < 60e3) return 'только что'; if (d < 3600e3) return `${Math.floor(d / 60e3)} мин назад`; if (d < 86400e3) return `${Math.floor(d / 3600e3)} ч назад`; return new Date(t).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }); };

export function Devices() {
  const { state, refresh, toast, busy } = useStore();
  const [code, setCode] = useState<{ code: string; expires: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [detach, setDetach] = useState(false);
  const [sessions, setSessions] = useState<Sess[] | null>(null);
  const call = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json() as { error?: string; code?: string; expires?: number; same?: boolean; sessions?: Sess[] };
    if (!r.ok) throw new Error(data.error || 'Ошибка');
    return data;
  }, []);
  const loadSessions = useCallback(async () => { try { const d = await call({ action: 'sessions' }); setSessions(d.sessions ?? []); } catch { setSessions([]); } }, [call]);
  useEffect(() => { if (state) loadSessions(); }, [state, loadSessions]);
  useEffect(() => {
    if (!code) return;
    const tick = () => { const s = Math.max(0, Math.ceil((code.expires - Date.now()) / 1000)); setLeft(s); if (!s) setCode(null); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [code]);
  const create = async () => { setWorking(true); try { const d = await call({ action: 'create' }); setCode({ code: d.code!, expires: d.expires! }); } catch (e) { toast(e instanceof Error ? e.message : 'Ошибка'); } finally { setWorking(false); } };
  const redeem = async () => { setWorking(true); try { const d = await call({ action: 'redeem', code: input }); if (d.same) toast('Это устройство уже подключено к этому профилю', true); else { toast('Профиль подключён. Инвентарь и прогресс синхронизированы', true); await refresh(); } setInput(''); await loadSessions(); } catch (e) { toast(e instanceof Error ? e.message : 'Ошибка'); } finally { setWorking(false); } };
  const doDetach = async () => { setWorking(true); try { await call({ action: 'detach' }); setDetach(false); await refresh(); toast('Устройство отвязано. Это новый пустой профиль', true); } catch (e) { toast(e instanceof Error ? e.message : 'Ошибка'); } finally { setWorking(false); } };
  const revoke = async (id?: string) => { setWorking(true); try { await call(id ? { action: 'revoke', id } : { action: 'revoke_others' }); toast(id ? 'Сеанс завершён' : 'Все остальные сеансы завершены', true); await loadSessions(); } catch (e) { toast(e instanceof Error ? e.message : 'Ошибка'); } finally { setWorking(false); } };
  const items = state?.inventory.length ?? 0;
  const others = (sessions ?? []).filter(s => !s.current).length;
  return <>
    <h1>Устройства</h1>
    <p className="lead">Один инвентарь и прогресс на компьютере и телефоне. Профиль хранится на сервере, а каждое устройство получает свой сеанс — его можно завершить отсюда.</p>

    <section className="panel" style={{ marginBottom: 20 }}>
      <h2 className="panel-title">Активные устройства <span>{sessions ? `${sessions.length} сеанс${sessions.length === 1 ? '' : sessions.length < 5 ? 'а' : 'ов'}` : 'загрузка…'}</span></h2>
      {sessions === null ? <div className="skeleton" style={{ height: 80 }} /> : <div className="session-list">
        {sessions.map(s => <div key={s.id} className={'session' + (s.current ? ' current' : '')}>
          <div className="session-icon" aria-hidden="true">{/iPhone|iPad|Android/.test(s.label) ? '📱' : '🖥️'}</div>
          <div className="session-info"><b>{s.label}{s.current ? ' — это устройство' : ''}</b><small>Вход {new Date(s.created).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })} · активность {when(s.lastSeen)}</small></div>
          {!s.current && <button className="btn btn-ghost btn-sm" onClick={() => revoke(s.id)} disabled={working}>Завершить</button>}
        </div>)}
      </div>}
      {others > 0 && <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={() => revoke()} disabled={working}>Завершить все остальные ({others})</button>}
      <p className="sync-note" style={{ marginTop: 12 }}>Завершённое устройство при следующем заходе получит новый пустой профиль. Ваш инвентарь на нём больше не откроется.</p>
    </section>

    <div className="sync-layout">
      <section className="panel">
        <h2 className="panel-title">Подключить другое устройство <span>с этого профиля</span></h2>
        <p className="sync-note">Код действует 15 минут и работает один раз. Тот, кто его введёт, получит доступ к этому профилю — не отправляйте код посторонним.</p>
        {code ? <><div className="sync-code" aria-live="polite">{code.code}</div><p className="sync-note">Истечёт через {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}. Профиль: {items} предметов.</p><button className="btn btn-ghost" onClick={create} disabled={working}>Новый код</button></>
          : <button className="btn btn-gold btn-lg" onClick={create} disabled={working || !state}>Создать код</button>}
        <ol className="sync-steps"><li>Создайте код здесь.</li><li>Откройте сайт на втором устройстве → <b>Инвентарь → Устройства</b>.</li><li>Введите код в поле справа и нажмите «Подключить».</li></ol>
      </section>
      <section className="panel">
        <h2 className="panel-title">Ввести код <span>на этом устройстве</span></h2>
        <p className="sync-note">Это устройство переключится на профиль, для которого создан код. Текущий пустой профиль можно будет вернуть через «Отвязать».</p>
        <div className="input-row" style={{ marginTop: 14 }}>
          <input className="input" placeholder="XXXX-XXXX" value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') redeem(); }} maxLength={9} aria-label="Код подключения" style={{ letterSpacing: 3, fontWeight: 700 }} />
          <button className="btn btn-gold" onClick={redeem} disabled={working || input.replace(/[^A-Z0-9]/g, '').length !== 8}>Подключить</button>
        </div>
        <div className="share-toggle"><div><b>Отвязать это устройство</b><small>Здесь появится новый пустой профиль. Старый профиль останется на сервере и на других устройствах.</small></div><button className="btn btn-ghost" onClick={() => setDetach(true)} disabled={working || busy}>Отвязать</button></div>
      </section>
    </div>
    <Modal open={detach} onClose={() => setDetach(false)} label="Отвязать устройство">
      <h3>Отвязать это устройство?</h3>
      <p>Здесь появится новый пустой профиль. Чтобы вернуться к текущему ({items} предметов), понадобится код с другого подключённого устройства.</p>
      <div className="actions"><button className="btn btn-ghost" onClick={() => setDetach(false)}>Отмена</button><button className="btn btn-danger" onClick={doDetach} disabled={working}>Отвязать</button></div>
    </Modal>
  </>;
}
