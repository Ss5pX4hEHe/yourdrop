'use client';
import { useEffect, useState } from 'react';
import { PRESETS, DEFAULT_CUSTOM, applyTheme, readTheme, type CustomTheme } from '@/lib/theme';
import { DEFAULT_FX, applyEffects, readEffects, type Effects } from './AmbientBackground';

export function ThemePicker() {
  const [theme, setTheme] = useState('amethyst');
  const [custom, setCustom] = useState<CustomTheme>(DEFAULT_CUSTOM);
  const [fx, setFx] = useState<Effects>(DEFAULT_FX);
  useEffect(() => {
    const saved = readTheme(); setTheme(saved.id); setCustom(saved.custom); applyTheme(saved.id, saved.custom);
    setFx(readEffects());
    const reset = () => { setTheme('amethyst'); setCustom(DEFAULT_CUSTOM); setFx(DEFAULT_FX); applyTheme('amethyst'); applyEffects(DEFAULT_FX); try { localStorage.removeItem('yd_custom_theme'); localStorage.removeItem('yd_fx'); } catch {} };
    window.addEventListener('yd-reset', reset);
    return () => window.removeEventListener('yd-reset', reset);
  }, []);
  const choose = (id: string) => { setTheme(id); applyTheme(id, custom); try { localStorage.setItem('yd_theme', id); } catch {} };
  const tune = (next: Partial<CustomTheme>) => {
    const value = { ...custom, ...next }; setCustom(value); setTheme('custom'); applyTheme('custom', value);
    try { localStorage.setItem('yd_theme', 'custom'); localStorage.setItem('yd_custom_theme', JSON.stringify(value)); } catch {}
  };
  const effects = (next: Partial<Effects>) => { const value = { ...fx, ...next }; setFx(value); applyEffects(value); };
  return <details className="theme-picker">
    <summary><span className="theme-dot" />Тема</summary>
    <div className="theme-menu">
      <span className="eyebrow">ЦВЕТ САЙТА</span>
      {PRESETS.map(t => <button type="button" key={t.id} aria-pressed={theme === t.id} onClick={() => choose(t.id)}><span style={{ background: t.color }} />{t.name}<b>{theme === t.id ? '✓' : ''}</b></button>)}
      <button type="button" aria-pressed={theme === 'custom'} onClick={() => choose('custom')}><span style={{ background: custom.accent }} />Своя тема<b>{theme === 'custom' ? '✓' : ''}</b></button>
      <div className="theme-custom">
        <label>Основной цвет<input type="color" value={custom.accent} onChange={e => tune({ accent: e.target.value })} aria-label="Основной цвет" /></label>
        <label>Оттенок фона · {Math.round(custom.hue)}°<input type="range" min="0" max="360" value={custom.hue} onChange={e => tune({ hue: Number(e.target.value) })} style={{ background: 'linear-gradient(90deg,hsl(0 40% 25%),hsl(60 40% 25%),hsl(120 40% 25%),hsl(180 40% 25%),hsl(240 40% 25%),hsl(300 40% 25%),hsl(360 40% 25%))' }} /></label>
        <label>Насыщенность фона · {custom.tint}%<input type="range" min="0" max="100" value={custom.tint} onChange={e => tune({ tint: Number(e.target.value) })} /></label>
        <small>Сочетание сохраняется в этом браузере.</small>
      </div>
      <span className="eyebrow">ЭФФЕКТЫ</span>
      <div className="theme-custom">
        <label>След курсора · {fx.trail}%<input type="range" min="0" max="100" value={fx.trail} onChange={e => effects({ trail: Number(e.target.value) })} /></label>
        <label>Подсветка · {fx.glow}%<input type="range" min="0" max="100" value={fx.glow} onChange={e => effects({ glow: Number(e.target.value) })} /></label>
        <label>Анимации · {fx.motion}%<input type="range" min="0" max="100" value={fx.motion} onChange={e => effects({ motion: Number(e.target.value) })} /></label>
      </div>
    </div>
  </details>;
}
