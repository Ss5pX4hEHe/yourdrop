import type { Case, Item } from './types';
export type Album = { id: string; title: string; description: string; items: Item[] };
export function makeAlbums(items: Item[], cases: Case[]): Album[] {
  const obtainable = new Set(cases.flatMap(c => c.items.map(i => i.id)));
  const pool = items.filter(i => i.type !== 'bonus' && i.image && obtainable.has(i.id)).sort((a, b) => a.price - b.price || a.id - b.id);
  const distinct = (rows: Item[], count: number, byWeapon = false) => {
    const keys = new Set<string>();
    return rows.filter(i => { const key = byWeapon ? i.weapon : i.name; if (keys.has(key)) return false; keys.add(key); return true; }).slice(0, count);
  };
  return [
    { id: 'starter', title: 'Первый арсенал', description: 'Шесть видов оружия для начала коллекции.', items: distinct(pool.filter(i => i.type === 'weapon'), 6, true) },
    { id: 'rifles', title: 'Главный калибр', description: 'Коллекция автоматических винтовок.', items: distinct(pool.filter(i => ['AK-47', 'M4A4', 'M4A1-S', 'Galil AR', 'FAMAS', 'AUG'].includes(i.weapon)), 6, true) },
    { id: 'sniper', title: 'Точный выстрел', description: 'Четыре скина для AWP.', items: distinct(pool.filter(i => i.weapon === 'AWP'), 4) },
    { id: 'covert', title: 'Красная полка', description: 'Шесть предметов тайной редкости.', items: distinct(pool.filter(i => i.rarity === 'covert'), 6, true) },
    { id: 'knives', title: 'Коллекционер клинков', description: 'Шесть разных видов ножей.', items: distinct(pool.filter(i => i.type === 'knife'), 6, true) },
    { id: 'gloves', title: 'Ручная работа', description: 'Четыре вида перчаток.', items: distinct(pool.filter(i => i.type === 'gloves'), 4, true) },
  ];
}
