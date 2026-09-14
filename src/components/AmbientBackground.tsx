'use client';
import { useEffect, useRef } from 'react';
import { currentLevel } from '@/lib/perf';

// Cursor light: the head of the trail follows the pointer with a short lerp and a point is
// recorded every animation frame, so the ribbon is continuous instead of a chain of dots.
// Users can tune it in the theme menu (strength 0–100, stored in localStorage as yd_fx).

export type Effects = { trail: number; glow: number; motion: number };
export const DEFAULT_FX: Effects = { trail: 35, glow: 40, motion: 100 };
export function readEffects(): Effects {
  try { const saved = JSON.parse(localStorage.getItem('yd_fx') ?? 'null'); if (saved && typeof saved === 'object') return { ...DEFAULT_FX, ...saved }; } catch {}
  return DEFAULT_FX;
}
export function applyEffects(fx: Effects) {
  const root = document.documentElement;
  root.style.setProperty('--fx-glow', String(fx.glow / 100));
  root.style.setProperty('--fx-motion', String(fx.motion / 100));
  root.dataset.motion = fx.motion === 0 ? 'off' : fx.motion < 50 ? 'low' : 'on';
  try { localStorage.setItem('yd_fx', JSON.stringify(fx)); } catch {}
  window.dispatchEvent(new CustomEvent('yd-fx', { detail: fx }));
}

export function AmbientBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = matchMedia('(pointer: fine)');
    type P = { x: number; y: number; at: number };
    let points: P[] = [];
    let frame = 0, color = '', ratio = 1, strength = readEffects().trail / 100;
    let target: { x: number; y: number } | null = null, head: { x: number; y: number } | null = null, idleFrames = 0;
    const LIFE = 650;
    const theme = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b49aff'; };
    const clear = () => { cancelAnimationFrame(frame); frame = 0; points = []; head = null; ctx.clearRect(0, 0, innerWidth, innerHeight); };
    const resize = () => { ratio = Math.min(devicePixelRatio || 1, 1.5); el.width = Math.round(innerWidth * ratio); el.height = Math.round(innerHeight * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); };
    const paint = (now: number) => {
      frame = 0;
      if (strength <= 0) { clear(); return; }
      if (target) {
        if (!head) head = { ...target };
        const dx = target.x - head.x, dy = target.y - head.y;
        head.x += dx * .3; head.y += dy * .3;
        const moving = Math.abs(dx) + Math.abs(dy) > .3;
        idleFrames = moving ? 0 : idleFrames + 1;
        if (moving || idleFrames < 6) points.push({ x: head.x, y: head.y, at: now });
      }
      points = points.filter(p => now - p.at < LIFE);
      if (points.length > 90) points = points.slice(-90);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!points.length) return;
      ctx.globalCompositeOperation = 'lighter';
      // Main element: a soft flashlight around the cursor head. Present at any strength.
      const last = points[points.length - 1], headLife = 1 - (now - last.at) / LIFE;
      if (headLife > 0) {
        const radius = 150 + 110 * strength;
        const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, radius);
        glow.addColorStop(0, color); glow.addColorStop(.35, color); glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = (.06 + .06 * strength) * headLife; ctx.fillStyle = glow;
        ctx.fillRect(last.x - radius, last.y - radius, radius * 2, radius * 2);
      }
      // Faint ribbon behind it, only when the effect is turned up.
      if (strength > .2) {
        const tail = (strength - .2) / .8;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          const life = 1 - (now - b.at) / LIFE;
          if (life <= 0) continue;
          ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.globalAlpha = .012 * life * tail; ctx.lineWidth = (30 + life * 60) * tail;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.globalAlpha = .03 * life * tail; ctx.lineWidth = (6 + life * 14) * tail;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (!pointer.matches || motion.matches || document.hidden || event.pointerType === 'touch' || strength <= 0 || currentLevel() === 'lite') return;
      target = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => { target = null; };
    const visibility = () => { if (document.hidden) clear(); };
    const fx = (event: Event) => { strength = ((event as CustomEvent<Effects>).detail?.trail ?? DEFAULT_FX.trail) / 100; if (strength <= 0) clear(); };
    theme(); resize();
    applyEffects(readEffects());
    const observer = new MutationObserver(theme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', resize);
    window.addEventListener('yd-fx', fx);
    window.addEventListener('yd-perf', clear);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', clear); pointer.addEventListener('change', clear);
    return () => { clear(); observer.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave); window.removeEventListener('resize', resize); window.removeEventListener('yd-fx', fx); window.removeEventListener('yd-perf', clear); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', clear); pointer.removeEventListener('change', clear); };
  }, []);
  return <>
    <div className="ambient-background" aria-hidden="true">
      <span className="orb o1" /><span className="orb o2" /><span className="orb o3" />
      <span className="dust">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%`, animationDuration: `${22 + (i % 7) * 5}s`, animationDelay: `${-(i * 3.7) % 30}s`, width: 2 + (i % 3), height: 2 + (i % 3), opacity: .25 + (i % 4) * .12 }} />)}</span>
    </div>
    <canvas ref={canvas} className="cursor-light" aria-hidden="true" />
  </>;
}
