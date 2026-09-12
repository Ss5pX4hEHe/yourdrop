'use client';
import { useEffect, useRef } from 'react';

// Cursor light: the head of the trail follows the pointer with a short lerp and a point is
// recorded every animation frame, so the ribbon is continuous instead of a chain of dots.
// Users can tune it in the theme menu (strength 0–100, stored in localStorage as yd_fx).

export type Effects = { trail: number; glow: number; motion: number };
export const DEFAULT_FX: Effects = { trail: 60, glow: 60, motion: 100 };
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
    const LIFE = 900;
    const theme = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#b49aff'; };
    const clear = () => { cancelAnimationFrame(frame); frame = 0; points = []; head = null; ctx.clearRect(0, 0, innerWidth, innerHeight); };
    const resize = () => { ratio = Math.min(devicePixelRatio || 1, 1.5); el.width = Math.round(innerWidth * ratio); el.height = Math.round(innerHeight * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); };
    const paint = (now: number) => {
      frame = 0;
      if (strength <= 0) { clear(); return; }
      if (target) {
        if (!head) head = { ...target };
        const dx = target.x - head.x, dy = target.y - head.y;
        head.x += dx * .42; head.y += dy * .42;
        const moving = Math.abs(dx) + Math.abs(dy) > .3;
        idleFrames = moving ? 0 : idleFrames + 1;
        if (moving || idleFrames < 6) points.push({ x: head.x, y: head.y, at: now });
      }
      points = points.filter(p => now - p.at < LIFE);
      if (points.length > 90) points = points.slice(-90);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!points.length) return;
      ctx.globalCompositeOperation = 'lighter';
      // Ribbon: a smooth path through the recorded points, fading and thinning towards the tail.
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const life = 1 - (now - b.at) / LIFE;
        if (life <= 0) continue;
        const width = (8 + life * 26) * strength;
        ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = .028 * life * strength; ctx.lineWidth = width * 3.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = .07 * life * strength; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // Halo around the head so the light does not "start" abruptly.
      const last = points[points.length - 1], life = 1 - (now - last.at) / LIFE;
      if (life > 0) {
        const radius = 120 + 60 * strength;
        const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, radius);
        glow.addColorStop(0, color); glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = .09 * life * strength; ctx.fillStyle = glow;
        ctx.fillRect(last.x - radius, last.y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (!pointer.matches || motion.matches || document.hidden || event.pointerType === 'touch' || strength <= 0) return;
      target = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => { target = null; };
    const visibility = () => { if (document.hidden) clear(); };
    const fx = (event: Event) => { strength = ((event as CustomEvent<Effects>).detail?.trail ?? 60) / 100; if (strength <= 0) clear(); };
    theme(); resize();
    applyEffects(readEffects());
    const observer = new MutationObserver(theme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', resize);
    window.addEventListener('yd-fx', fx);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', clear); pointer.addEventListener('change', clear);
    return () => { clear(); observer.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave); window.removeEventListener('resize', resize); window.removeEventListener('yd-fx', fx); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', clear); pointer.removeEventListener('change', clear); };
  }, []);
  return <><div className="ambient-background" aria-hidden="true" /><canvas ref={canvas} className="cursor-light" aria-hidden="true" /></>;
}
