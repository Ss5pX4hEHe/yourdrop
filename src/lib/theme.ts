// Colour maths for custom themes. Everything derives from one accent colour plus a
// background hue/tint, so the whole palette stays consistent.
export type CustomTheme = { accent: string; hue: number; tint: number };
export const PRESETS = [
  { id: 'amethyst', name: 'Аметист', color: '#b49aff' },
  { id: 'mint', name: 'Мята', color: '#69e0b1' },
  { id: 'ocean', name: 'Океан', color: '#6cbcff' },
  { id: 'sunset', name: 'Закат', color: '#ffb272' },
  { id: 'ruby', name: 'Рубин', color: '#ff8baa' },
];
export const DEFAULT_CUSTOM: CustomTheme = { accent: '#7be0ff', hue: 210, tint: 35 };

export function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); if (!m) return [260, 100, 80];
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l * 100];
  const s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
export function hsl(h: number, s: number, l: number, a = 1) { return a < 1 ? `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})` : `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`; }

/** Variables applied to :root for a custom theme. */
export function customVariables(t: CustomTheme): Record<string, string> {
  const [h, s] = hexToHsl(t.accent);
  const sat = Math.max(45, Math.min(100, s));
  const bs = Math.max(4, t.tint * .55); // background saturation from tint 0..100
  return {
    '--accent': hsl(h, sat, 75), '--accent-dark': hsl(h, Math.min(sat, 70), 52), '--accent-soft': hsl(h, sat, 75, .09),
    '--gold': hsl(h, sat, 75), '--gold-2': hsl(h, sat, 84), '--violet': hsl(h, Math.min(sat, 70), 52), '--violet-2': hsl(h, sat, 75),
    '--bg': hsl(t.hue, bs, 5.5), '--bg-2': hsl(t.hue, bs, 7.5), '--panel': hsl(t.hue, bs, 10), '--panel-2': hsl(t.hue, bs, 14),
    '--line': hsl(t.hue, bs * .8, 17), '--line-2': hsl(t.hue, bs * .7, 27),
  };
}
const KEYS = ['--accent', '--accent-dark', '--accent-soft', '--gold', '--gold-2', '--violet', '--violet-2', '--bg', '--bg-2', '--panel', '--panel-2', '--line', '--line-2'];
export function applyTheme(id: string, custom?: CustomTheme) {
  const root = document.documentElement;
  for (const k of KEYS) root.style.removeProperty(k);
  root.dataset.theme = id;
  if (id === 'custom') for (const [k, v] of Object.entries(customVariables(custom ?? DEFAULT_CUSTOM))) root.style.setProperty(k, v);
}
export function readTheme(): { id: string; custom: CustomTheme } {
  let id = 'amethyst', custom = DEFAULT_CUSTOM;
  try {
    const saved = localStorage.getItem('yd_theme'); if (saved && (saved === 'custom' || PRESETS.some(p => p.id === saved))) id = saved;
    const c = JSON.parse(localStorage.getItem('yd_custom_theme') ?? 'null');
    if (c && /^#[0-9a-f]{6}$/i.test(c.accent) && Number.isFinite(c.hue) && Number.isFinite(c.tint)) custom = { accent: c.accent, hue: Math.max(0, Math.min(360, c.hue)), tint: Math.max(0, Math.min(100, c.tint)) };
  } catch {}
  return { id, custom };
}
