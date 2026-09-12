import type { Case, Item } from './types';

export type RouteStep = { item: Item; where: { id: string; name: string; chance: number }[] };
export type Route = { id: string; title: string; description: string; reward: { kind: 'frame' | 'background'; id: string; name: string }; steps: RouteStep[] };

const quantiles = (rows: Item[], n = 5) => { if (rows.length <= n) return rows; const out: Item[] = []; const marks = [.08, .25, .45, .65, .85]; for (const q of marks.slice(0, n)) { const it = rows[Math.min(rows.length - 1, Math.floor(q * rows.length))]; if (!out.includes(it)) out.push(it); } return out; };
// Walk the price ladder (8%…85% quantiles) and take the first unseen weapon at each mark.
const ladder = (rows: Item[], n = 5) => { const seen = new Set<string>(), out: Item[] = []; const marks = [.06, .22, .42, .62, .82]; for (const q of marks.slice(0, n)) { for (let i = Math.floor(q * rows.length); i < rows.length; i++) { if (seen.has(rows[i].weapon) || out.includes(rows[i])) continue; seen.add(rows[i].weapon); out.push(rows[i]); break; } } return out; };

/** Five-step collection routes. Deterministic: the same catalog always gives the same routes. */
export function makeRoutes(items: Item[], cases: Case[]): Route[] {
  const where = new Map<number, { id: string; name: string; chance: number }[]>();
  for (const c of cases) for (const r of c.items) { const list = where.get(r.id) ?? []; list.push({ id: c.id, name: c.name, chance: r.weight }); where.set(r.id, list); }
  const pool = items.filter(i => i.type !== 'bonus' && i.image && where.has(i.id)).sort((a, b) => a.price - b.price || a.id - b.id);
  const steps = (rows: Item[]): RouteStep[] => rows.map(item => ({ item, where: (where.get(item.id) ?? []).sort((a, b) => b.chance - a.chance).slice(0, 2) }));
  const pistols = ['Glock-18', 'USP-S', 'P250', 'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'P2000', 'Desert Eagle', 'Dual Berettas', 'R8 Revolver'];
  const rifles = ['AK-47', 'M4A4', 'M4A1-S', 'Galil AR', 'FAMAS', 'AUG', 'SG 553'];
  const guns = [...pistols, ...rifles, 'AWP', 'SSG 08', 'SCAR-20', 'G3SG1', 'MP9', 'MAC-10', 'MP7', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon', 'Nova', 'XM1014', 'Sawed-Off', 'MAG-7', 'M249', 'Negev'];
  const cheapFirst = (rows: Item[]) => rows.filter(i => i.price >= 5);
  const list: Route[] = [
    { id: 'sniper', title: 'Путь снайпера', description: 'Пять скинов на AWP — от простого к дорогому.', reward: { kind: 'background', id: 'sniper', name: 'Фон «Прицел»' }, steps: steps(quantiles(cheapFirst(pool.filter(i => i.weapon === 'AWP')))) },
    { id: 'pistols', title: 'Карманный арсенал', description: 'Пять разных пистолетов в одной коллекции.', reward: { kind: 'frame', id: 'emerald', name: 'Изумрудная рамка' }, steps: steps(ladder(cheapFirst(pool.filter(i => pistols.includes(i.weapon))))) },
    { id: 'rifles', title: 'Стальной ряд', description: 'Пять штурмовых винтовок разных моделей.', reward: { kind: 'background', id: 'forge', name: 'Фон «Кузница»' }, steps: steps(ladder(cheapFirst(pool.filter(i => rifles.includes(i.weapon))))) },
    { id: 'covert', title: 'Красная линия', description: 'Пять тайных предметов — путь к красному инвентарю.', reward: { kind: 'frame', id: 'crimson', name: 'Багровая рамка' }, steps: steps(ladder(pool.filter(i => i.rarity === 'covert' && i.type === 'weapon' && guns.includes(i.weapon)))) },
    { id: 'blade', title: 'Первый клинок', description: 'Две пары перчаток и три ножа — витрина для настоящего коллекционера.', reward: { kind: 'frame', id: 'cyan', name: 'Неоновая рамка' }, steps: steps([...quantiles(pool.filter(i => i.rarity === 'rare' && i.type === 'gloves'), 2), ...quantiles(pool.filter(i => i.type === 'knife'), 3)]) },
  ];
  return list.filter(r => r.steps.length === 5);
}
export const routeAward = (id: string) => 'route:' + id;
