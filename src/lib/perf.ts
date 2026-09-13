'use client';
import { useEffect, useState } from 'react';

export type PerfMode = 'auto' | 'full' | 'lite';
export type PerfLevel = 'full' | 'lite';

/** Runs before first paint (inlined in <head>) and again on demand. Keep it dependency-free. */
export const PERF_BOOT = `(function(){try{var m=localStorage.getItem('yd_perf');var n=navigator;var auto=!m||m==='auto';var weak=(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||(n.connection&&n.connection.saveData);var mobile=matchMedia('(pointer:coarse)').matches||innerWidth<820;var lite=m==='lite'||(auto&&(mobile||weak));document.documentElement.dataset.perf=lite?'lite':'full';document.documentElement.dataset.perfMode=m||'auto';}catch(e){}})();`;

export function readPerfMode(): PerfMode { try { const m = localStorage.getItem('yd_perf'); return m === 'lite' || m === 'full' ? m : 'auto'; } catch { return 'auto'; } }
export function currentLevel(): PerfLevel { return typeof document !== 'undefined' && document.documentElement.dataset.perf === 'lite' ? 'lite' : 'full'; }
export function detectLevel(mode: PerfMode): PerfLevel {
  if (mode !== 'auto') return mode;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const weak = (n.deviceMemory !== undefined && n.deviceMemory <= 2) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 2) || !!n.connection?.saveData;
  const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 820;
  return mobile || weak ? 'lite' : 'full';
}
export function applyPerf(mode: PerfMode) {
  try { if (mode === 'auto') localStorage.removeItem('yd_perf'); else localStorage.setItem('yd_perf', mode); } catch {}
  const level = detectLevel(mode);
  document.documentElement.dataset.perf = level;
  document.documentElement.dataset.perfMode = mode;
  window.dispatchEvent(new CustomEvent('yd-perf', { detail: level }));
}
/** Current level ('lite' on phones / weak devices unless overridden). */
export function usePerf(): PerfLevel {
  const [level, setLevel] = useState<PerfLevel>('full');
  useEffect(() => {
    setLevel(currentLevel());
    const on = (e: Event) => setLevel((e as CustomEvent<PerfLevel>).detail);
    window.addEventListener('yd-perf', on);
    return () => window.removeEventListener('yd-perf', on);
  }, []);
  return level;
}
