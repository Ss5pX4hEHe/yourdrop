import type { Case, CaseLite, Item } from './types';

export type Pick = { id: string; title: string; description: string; cases: (CaseLite & { why: string })[] };
const pct = (v: number) => `${(v * 100).toFixed(v * 100 >= 10 ? 0 : 1)}%`;

/** Curated rows for the home page, computed from the catalog once at build time. */
export function makePicks(cases: Case[], items: Item[], lite: (c: Case) => CaseLite): Pick[] {
  const byId = new Map(items.map(i => [i.id, i]));
  const share = (c: Case, test: (i: Item) => boolean) => c.items.reduce((s, r) => s + (byId.get(r.id) && test(byId.get(r.id)!) ? r.weight : 0), 0);
  const top = (c: Case) => c.items.reduce((m, r) => Math.max(m, byId.get(r.id)?.price ?? 0), 0);
  const rub = cases.filter(c => c.currency === 'RUB');
  const rows: Pick[] = [
    { id: 'cheap', title: 'До 100 ₽', description: 'Недорогие кейсы с самым дорогим призом внутри.', cases: rub.filter(c => c.price <= 100).sort((a, b) => top(b) - top(a)).slice(0, 8).map(c => ({ ...lite(c), why: `приз до ${Math.round(top(c)).toLocaleString('ru-RU')} ₽` })) },
    { id: 'awp', title: 'Любителям AWP', description: 'Где чаще всего выпадают скины на AWP.', cases: rub.map(c => ({ c, s: share(c, i => i.weapon === 'AWP') })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map(x => ({ ...lite(x.c), why: `AWP · ${pct(x.s)}` })) },
    { id: 'red', title: 'Красный инвентарь', description: 'Лучший шанс тайного (красного) скина на каждый вложенный рубль.', cases: rub.filter(c => c.price >= 20).map(c => ({ c, s: share(c, i => i.rarity === 'covert' && i.type === 'weapon') })).filter(x => x.s > 0).sort((a, b) => b.s / b.c.price - a.s / a.c.price).slice(0, 8).map(x => ({ ...lite(x.c), why: `красный · ${pct(x.s)}` })) },
    { id: 'knife', title: 'Охота за ножом', description: 'Обычные кейсы, где нож или перчатки выпадают чаще всего в пересчёте на цену.', cases: rub.filter(c => c.price >= 20).map(c => ({ c, s: share(c, i => i.type === 'knife' || i.type === 'gloves') })).filter(x => x.s > 0 && x.s < .5).sort((a, b) => b.s / b.c.price - a.s / a.c.price).slice(0, 8).map(x => ({ ...lite(x.c), why: `нож · ${pct(x.s)}` })) },
  ];
  return rows.filter(r => r.cases.length >= 3);
}
