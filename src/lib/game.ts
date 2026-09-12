import { catalog, itemMap } from './catalog';
import { cents } from './types';
import { resolveUpgradeChance } from './upgrade';
import { normalizeProgress, recordRound } from './progression';
import { FRAMES, BACKGROUNDS } from './rewards';
import type { Action, Owned, Result, State } from './types';
export type { Action, Owned, Result, State } from './types';

export const fresh = (): State => ({ balance: 0, coins: 0, inventory: [], history: [], pending: null, opens: 0, requests: [] });
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const fail = (message: string): never => { throw new Error(message); };
function log(s: State, label: string, delta: number, items: number[], now: number) { s.history.unshift({ uid: crypto.randomUUID(), at: now, label, delta, items }); s.history = s.history.slice(0, 120); }
export function settle(s: State, now = Date.now()) {
  if (s.pending && s.pending.due <= now) { const amount = s.pending.amount; s.balance += amount; s.coins += Math.floor(amount / 1000); s.pending = null; log(s, 'Пополнение баланса', amount, [], now); return true; } return false;
}
function validMoney(n: unknown, allowZero = false): number { if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < (allowZero ? 0 : 1) || n > 100_000_000_000) fail('Введите сумму от 0,01 до 1 000 000 000 ₽'); return n as number; }
function choose<T>(rows: T[], rng: () => number): T { return rows[Math.min(rows.length - 1, Math.floor(rng() * rows.length))]; }
function give(s: State, id: number, now: number): Owned { const item = itemMap.get(id)!; const owned = { uid: crypto.randomUUID(), id, value: cents(item.price), at: now }; s.inventory.unshift(owned); return owned; }
function selected(s: State, ids: unknown, min: number, max: number) { if (!Array.isArray(ids) || ids.length < min || ids.length > max || new Set(ids).size !== ids.length) fail(min ? `Выберите от ${min} до ${max} разных предметов` : `Можно выбрать не больше ${max} предметов`); const entries = (ids as string[]).map(id => s.inventory.find(i => i.uid === id)); if (entries.some(i => !i)) fail('Предмет уже использован или продан'); return entries as Owned[]; }
export function act(original: State, action: Action, now = Date.now(), rng = random): { state: State; result: Result } {
  const s = structuredClone(original); settle(s, now);
  const progress = normalizeProgress(s, now);
  if (action.requestId && s.requests.includes(action.requestId)) return { state: s, result: { duplicate: true } };
  let result: Result = {};
  if (['sell', 'upgrade', 'contract'].includes(action.type) && Array.isArray(action.ids) && action.ids.some(id => progress.locked.includes(id))) fail('Снимите защиту с предмета перед продажей или использованием');
  if (action.type === 'topup') { const amount = validMoney(action.amount); if (s.pending) fail('Пополнение уже обрабатывается'); if (s.balance + amount > 100_000_000_000) fail('Максимальный баланс — 1 000 000 000 ₽'); s.pending = { amount, due: now + 5000 }; }
  else if (action.type === 'reset') { s.pending = null; log(s, 'Баланс сброшен', -s.balance, [], now); s.balance = 0; s.coins = 0; }
  else if (action.type === 'resetAll') {
    if (action.confirmReset !== true) fail('Подтвердите полное удаление прогресса');
    // Keep only replay protection; no visible progress or pending deposit survives.
    const requests = s.requests;
    Object.assign(s, fresh());
    delete s.progress;
    s.requests = requests;
  }
  else if (action.type === 'lock') { const owned = selected(s, action.ids, 1, 5000); if (typeof action.locked !== 'boolean') fail('Укажите состояние защиты'); const ids = owned.map(i => i.uid); progress.locked = action.locked ? [...new Set([...progress.locked, ...ids])] : progress.locked.filter(id => !ids.includes(id)); }
  else if (action.type === 'showcase') { const owned = selected(s, action.ids, 0, 8); progress.showcase = owned.map(i => i.uid); if (action.title !== undefined) { if (typeof action.title !== 'string' || !action.title.trim() || action.title.length > 48) fail('Название витрины должно содержать от 1 до 48 символов'); progress.title = action.title.trim(); } }
  else if (action.type === 'share') { const cur = progress.share ?? { enabled: false, badges: true, stats: true, value: true }; const next = { ...cur }; for (const key of ['enabled', 'badges', 'stats', 'value'] as const) { const v = action.share?.[key]; if (v !== undefined) { if (typeof v !== 'boolean') fail('Некорректные настройки витрины'); next[key] = v; } } if (next.enabled && !progress.publicId) fail('Не удалось создать публичную ссылку'); progress.share = next; }
  else if (action.type === 'appearance') { for (const [key, options] of [['frame', FRAMES], ['background', BACKGROUNDS]] as const) { const id = action[key]; if (id === undefined) continue; const option = options.find(o => o.id === id); if (!option || (option.requires && !progress.achievements.includes(option.requires))) fail('Это оформление ещё не открыто'); progress[key] = id; } }
  else if (action.type === 'sell') { const owned = selected(s, action.ids, 1, 5000); const sum = owned.reduce((a, i) => a + i.value, 0); s.inventory = s.inventory.filter(i => !action.ids!.includes(i.uid)); s.balance += sum; log(s, `Продажа · ${owned.length} шт.`, sum, owned.map(i => i.id), now); }
  else if (action.type === 'open') {
    const box = catalog.cases.find(c => c.id === action.caseId); if (!box) fail('Кейс не найден');
    const count = action.count ?? 1; if (!Number.isInteger(count) || count < 1 || count > 10) fail('Можно открыть от 1 до 10 кейсов');
    if (s.inventory.length + count > 5000) fail('Продайте предметы: инвентарь заполнен');
    const cost = box!.currency === 'BCN' ? box!.price * count : cents(box!.price) * count;
    if ((box!.currency === 'BCN' ? s.coins : s.balance) < cost) fail(box!.currency === 'BCN' ? 'Недостаточно BCN. Монеты начисляются за пополнение: 1 BCN за каждые 10 ₽' : 'Недостаточно средств. Пополните баланс');
    if (box!.currency === 'BCN') s.coins -= cost; else s.balance -= cost;
    const wins: Owned[] = [];
    for (let k = 0; k < count; k++) { let cursor = rng(); let id = box!.items.at(-1)!.id; for (const row of box!.items) { cursor -= row.weight; if (cursor < 0) { id = row.id; break; } } wins.push(give(s, id, now)); }
    s.opens += count; result = { items: wins, success: true }; log(s, `${box!.name} · ${count} шт.${box!.currency === 'BCN' ? ` · ${cost} BCN` : ''}`, box!.currency === 'BCN' ? 0 : -cost, wins.map(i => i.id), now);
    recordRound(s, 'case', box!.currency === 'BCN' ? cost * 10 : cost, wins, now, count);
  } else if (action.type === 'upgrade') {
    const extra = validMoney(action.extra ?? 0, true); if (extra > s.balance) fail('Недостаточно баланса');
    const owned = selected(s, action.ids ?? [], extra > 0 ? 0 : 1, 6);
    const target = itemMap.get(action.target!); if (!target || target.type === 'bonus') fail('Выберите целевой предмет');
    const value = owned.reduce((a, i) => a + i.value, extra); if (value <= 0) fail('Добавьте предметы или сумму с баланса'); if (cents(target!.price) <= value) fail('Цель должна стоить дороже ставки');
    const chance = resolveUpgradeChance(value, cents(target!.price), action.chance); const success = rng() < chance;
    s.inventory = s.inventory.filter(i => !owned.some(o => o.uid === i.uid)); s.balance -= extra;
    result = { success, chance, items: success ? [give(s, target!.id, now)] : [] }; log(s, success ? `Апгрейд · успех (${(chance * 100).toFixed(1)}%)` : `Апгрейд · неудача (${(chance * 100).toFixed(1)}%)`, -extra, success ? [target!.id] : owned.map(i => i.id), now);
    recordRound(s, 'upgrade', value, result.items ?? [], now);
  } else if (action.type === 'contract') {
    const owned = selected(s, action.ids, 3, 10); const sum = owned.reduce((a, i) => a + i.value, 0);
    const pool = catalog.items.filter(i => i.type !== 'bonus' && cents(i.price) >= sum * 0.5 && cents(i.price) <= sum * 1.5);
    if (!pool.length) fail('Нет предметов в диапазоне контракта. Измените состав');
    const target = choose(pool, rng); s.inventory = s.inventory.filter(i => !action.ids!.includes(i.uid)); result = { items: [give(s, target.id, now)], success: true }; log(s, `Контракт · ${owned.length} шт.`, 0, [target.id], now);
    recordRound(s, 'contract', sum, result.items ?? [], now);
  } else fail('Неизвестное действие');
  if (action.requestId) s.requests = [...s.requests.slice(-49), action.requestId];
  normalizeProgress(s, now);
  return { state: s, result };
}
