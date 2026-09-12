import { albums, itemMap, routes } from './catalog';
import { routeAward } from './routes';
import type { State, Owned } from './types';

export function normalizeProgress(s: State, now = Date.now()) {
  if (!s.progress) {
    s.progress = { acquired: [...new Set([...s.inventory.map(i => i.id), ...s.history.flatMap(e => e.items)])], achievements: [], locked: [], showcase: [], title: 'Моя коллекция', frame: 'plain', background: 'carbon', stats: { since: now, caseSpent: 0, caseReturn: 0, caseOpens: 0, upgradeAttempts: 0, upgradeWins: 0, upgradeSpent: 0, upgradeReturn: 0, contractSpent: 0, contractReturn: 0, bestDrop: null, rounds: [] } };
  }
  const p = s.progress;
  const owned = new Set(s.inventory.map(i => i.uid));
  p.locked = p.locked.filter(uid => owned.has(uid));
  p.showcase = p.showcase.filter(uid => owned.has(uid));
  const acquired = new Set(p.acquired);
  const awards: Record<string, boolean> = {
    first: acquired.size > 0, collector: acquired.size >= 10, hundred: s.opens >= 100,
    upgrade: p.stats.upgradeWins > 0, knife: p.acquired.some(id => itemMap.get(id)?.type === 'knife'),
    album: albums.some(a => a.items.length > 0 && a.items.every(i => acquired.has(i.id))),
  };
  for (const route of routes) awards[routeAward(route.id)] = route.steps.every(step => acquired.has(step.item.id));
  p.achievements = [...new Set([...p.achievements, ...Object.keys(awards).filter(k => awards[k])])];
  if (!p.share) p.share = { enabled: false, badges: true, stats: true, value: true };
  return p;
}

export function recordRound(s: State, kind: 'case' | 'upgrade' | 'contract', spent: number, wins: Owned[], now: number, count = 1) {
  const p = normalizeProgress(s, now), stats = p.stats;
  const returned = wins.reduce((sum, item) => sum + item.value, 0);
  p.acquired = [...new Set([...p.acquired, ...wins.map(i => i.id)])];
  if (kind === 'case') { stats.caseSpent += spent; stats.caseReturn += returned; stats.caseOpens += count; }
  if (kind === 'upgrade') { stats.upgradeAttempts++; stats.upgradeWins += wins.length ? 1 : 0; stats.upgradeSpent += spent; stats.upgradeReturn += returned; }
  if (kind === 'contract') { stats.contractSpent += spent; stats.contractReturn += returned; }
  for (const win of wins) if (!stats.bestDrop || win.value > stats.bestDrop.value) stats.bestDrop = win;
  stats.rounds = [...stats.rounds.slice(-199), { at: now, kind, delta: returned - spent }];
}
