export type Rarity = 'base' | 'industrial' | 'mil-spec' | 'restricted' | 'classified' | 'covert' | 'rare' | '_unknown';
export type ItemType = 'weapon' | 'knife' | 'gloves' | 'item' | 'bonus';
export type Item = { id: number; name: string; price: number; rarity: Rarity; image: string; weapon: string; finish: string; type: ItemType };
export type CaseRow = { id: number; weight: number };
export type Case = { id: string; name: string; category: string; price: number; currency: 'RUB' | 'BCN'; image: string; items: CaseRow[] };
export type CaseLite = Omit<Case, 'items'> & { count: number; top: number };
export type Owned = { uid: string; id: number; value: number; at: number };
export type Event = { uid: string; at: number; label: string; delta: number; items: number[] };
export type GameStats = { since: number; caseSpent: number; caseReturn: number; caseOpens: number; upgradeAttempts: number; upgradeWins: number; upgradeSpent: number; upgradeReturn: number; contractSpent: number; contractReturn: number; bestDrop: Owned | null; rounds: { at: number; kind: string; delta: number }[] };
export type ShareSettings = { enabled: boolean; badges: boolean; stats: boolean; value: boolean };
export type Progress = { acquired: number[]; achievements: string[]; locked: string[]; showcase: string[]; title: string; frame: string; background: string; stats: GameStats; share?: ShareSettings; publicId?: string };
export type State = { balance: number; coins: number; inventory: Owned[]; history: Event[]; pending: { amount: number; due: number } | null; opens: number; requests: string[]; progress?: Progress };
export type Action = { type: string; requestId?: string; amount?: number; caseId?: string; count?: number; ids?: string[]; target?: number; extra?: number; chance?: number; locked?: boolean; title?: string; frame?: string; background?: string; confirmReset?: boolean; share?: Partial<ShareSettings> };
export type Result = { items?: Owned[]; success?: boolean; chance?: number; duplicate?: boolean };
export type Lookup = Record<number, Item>;
export type ApiResponse = { state: State; result: Result; lookup: Lookup; error?: string };

export const RARITY: Record<Rarity, { color: string; label: string }> = {
  base: { color: '#b0c3d9', label: 'Ширпотреб' },
  industrial: { color: '#5e98d9', label: 'Промышленное' },
  'mil-spec': { color: '#4b69ff', label: 'Армейское' },
  restricted: { color: '#8847ff', label: 'Запрещённое' },
  classified: { color: '#d32ce6', label: 'Засекреченное' },
  covert: { color: '#eb4b4b', label: 'Тайное' },
  rare: { color: '#ffd166', label: 'Исключительное' },
  _unknown: { color: '#8b96a8', label: 'Предмет' },
};
export const rarityColor = (r: string) => (RARITY as Record<string, { color: string }>)[r]?.color ?? RARITY._unknown.color;

export const cents = (n: number) => Math.round(n * 100);
const fmt2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export const rub = (c: number) => `${Number.isInteger(c / 100) ? fmt0.format(c / 100) : fmt2.format(c / 100)} ₽`;
export const rubF = (price: number) => rub(cents(price));
export const pct = (p: number) => (p >= 1 ? `${p.toFixed(p >= 10 ? 1 : 2)}%` : p >= 0.01 ? `${p.toFixed(3)}%` : `${p.toFixed(4)}%`);
export const upgradeChance = (value: number, targetCents: number) => (targetCents > value ? Math.min(0.75, (value / targetCents) * 0.9) : 0);
