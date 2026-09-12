'use client';
import { RARITY, type Lookup, type Owned } from '@/lib/types';
export type InvFilter = { q: string; weapon: string; rarity: string; min: string; max: string; sort: string; protection: string };
export const emptyFilter: InvFilter = { q: '', weapon: '', rarity: '', min: '', max: '', sort: 'new', protection: '' };
export function filterInventory(inventory: Owned[], lookup: Lookup, filter: InvFilter, locked: string[]) {
  const number = (s: string, fallback: number) => s.trim() ? Number(s.replace(',', '.')) : fallback;
  const min = number(filter.min, 0), max = number(filter.max, Infinity);
  const invalid = min < 0 || max < min || !Number.isFinite(min) || (filter.max.trim() !== '' && !Number.isFinite(max));
  const rows = invalid ? [] : inventory.filter(o => { const item = lookup[o.id]; return item && item.name.toLowerCase().includes(filter.q.trim().toLowerCase()) && (!filter.weapon || item.weapon === filter.weapon) && (!filter.rarity || item.rarity === filter.rarity) && o.value >= min * 100 && o.value <= max * 100 && (!filter.protection || (filter.protection === 'locked' ? locked.includes(o.uid) : !locked.includes(o.uid))); });
  rows.sort((a, b) => filter.sort === 'desc' ? b.value - a.value : filter.sort === 'asc' ? a.value - b.value : b.at - a.at);
  return { rows, invalid };
}
export function InventoryFilters({ value, onChange, inventory, lookup }: { value: InvFilter; onChange: (v: InvFilter) => void; inventory: Owned[]; lookup: Lookup }) {
  const set = (key: keyof InvFilter, content: string) => onChange({ ...value, [key]: content });
  const weapons = [...new Set(inventory.map(o => lookup[o.id]?.weapon).filter(Boolean))].sort();
  return <div className="inventory-filters">
    <label className="filter-search">Поиск<input className="input" placeholder="Название скина" value={value.q} onChange={e => set('q', e.target.value)} /></label>
    <label>Оружие<select className="input" value={value.weapon} onChange={e => set('weapon', e.target.value)}><option value="">Все виды</option>{weapons.map(w => <option key={w}>{w}</option>)}</select></label>
    <label>Редкость<select className="input" value={value.rarity} onChange={e => set('rarity', e.target.value)}><option value="">Любая</option>{Object.entries(RARITY).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select></label>
    <label>Цена от, ₽<input className="input" inputMode="decimal" placeholder="0" value={value.min} onChange={e => set('min', e.target.value)} /></label>
    <label>Цена до, ₽<input className="input" inputMode="decimal" placeholder="Без ограничения" value={value.max} onChange={e => set('max', e.target.value)} /></label>
    <label>Сортировка<select className="input" value={value.sort} onChange={e => set('sort', e.target.value)}><option value="new">Сначала новые</option><option value="desc">Сначала дорогие</option><option value="asc">Сначала дешёвые</option></select></label>
    <label>Защита<select className="input" value={value.protection} onChange={e => set('protection', e.target.value)}><option value="">Все предметы</option><option value="locked">Защищённые</option><option value="free">Без защиты</option></select></label>
    <button className="btn btn-ghost" onClick={() => onChange({ ...emptyFilter })}>Сбросить фильтры</button>
  </div>;
}
