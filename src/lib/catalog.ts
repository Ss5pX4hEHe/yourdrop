import raw from './catalog.json';
import type { Case, CaseLite, Item, Lookup } from './types';
import { configureCases } from './case-settings';
import { makeAlbums } from './collections';
import { makeRoutes } from './routes';
import { makePicks } from './picks';

const source = raw as unknown as { items: Item[]; cases: Case[]; sourceDate: string };
export const catalog = { ...source, cases: configureCases(source.cases, source.items) };
export const itemMap = new Map<number, Item>(catalog.items.map(i => [i.id, i]));
export const caseMap = new Map<string, Case>(catalog.cases.map(c => [c.id, c]));
export const albums = makeAlbums(catalog.items, catalog.cases);
export const routes = makeRoutes(catalog.items, catalog.cases);

export function lookupFor(ids: Iterable<number>): Lookup {
  const out: Lookup = {};
  for (const id of ids) { const item = itemMap.get(id); if (item && !out[id]) out[id] = item; }
  return out;
}

export function caseLite(c: Case): CaseLite {
  const { items, ...rest } = c;
  const top = items.reduce((m, r) => Math.max(m, itemMap.get(r.id)?.price ?? 0), 0);
  return { ...rest, count: items.length, top };
}

export const picks = makePicks(catalog.cases, catalog.items, caseLite);

export const CATEGORY_ORDER = ['Стартовая коллекция', 'Your Drop Originals', 'Особая серия', 'На острие', 'Высшая лига', 'Архив миссий', 'Оружейная', 'За бонусы'];
