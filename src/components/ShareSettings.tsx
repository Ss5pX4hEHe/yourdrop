'use client';
import { useEffect, useState } from 'react';
import { useStore } from './Store';

export function ShareSettings() {
  const { state, act, busy, toast } = useStore();
  const p = state?.progress;
  const share = p?.share ?? { enabled: false, badges: true, stats: true, value: true };
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(location.origin), []);
  const url = p?.publicId ? `${origin}/u/${p.publicId}` : '';
  const update = async (next: Partial<typeof share>) => { try { await act({ type: 'share', share: next }); if (next.enabled === true) toast('Публичная ссылка включена', true); if (next.enabled === false) toast('Ссылка отключена — страница больше не открывается', true); } catch {} };
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована', true); } catch { toast('Скопируйте ссылку вручную'); } };
  return <div className="share-block">
    <div className="share-toggle"><div><b>Публичная витрина по ссылке</b><small>Другие увидят название, выбранные предметы и оформление. Инвентарь целиком не показывается.</small></div>
      <label className={'local-fast' + (share.enabled ? ' enabled' : '')} style={{ padding: '8px 10px' }}><input type="checkbox" checked={share.enabled} disabled={busy || !state} onChange={e => update({ enabled: e.target.checked })} /><span className="switch-track" aria-hidden="true"><span /></span><span><b>{share.enabled ? 'Включена' : 'Выключена'}</b></span></label></div>
    {share.enabled && url && <div className="share-link"><input className="input" readOnly value={url} onFocus={e => e.target.select()} aria-label="Публичная ссылка" /><button className="btn btn-gold" onClick={copy}>Копировать</button><a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">Открыть</a></div>}
    {share.enabled && <div className="share-options">
      <label><input type="checkbox" checked={share.badges} disabled={busy} onChange={e => update({ badges: e.target.checked })} />Показывать значки достижений и пройденные маршруты</label>
      <label><input type="checkbox" checked={share.stats} disabled={busy} onChange={e => update({ stats: e.target.checked })} />Показывать статистику открытий и апгрейдов</label>
      <label><input type="checkbox" checked={share.value} disabled={busy} onChange={e => update({ value: e.target.checked })} />Показывать стоимость предметов и инвентаря</label>
    </div>}
  </div>;
}
