'use client';
import { rarityColor, rub, rubF, pct } from '@/lib/types';
import type { Item, Owned } from '@/lib/types';
import { SkinImage } from './SkinImage';
import { useStore } from './Store';
import { OwnedActions } from './OwnedActions';

type Props = { item: Item; value?: number; selected?: boolean; onClick?: () => void; chance?: number; className?: string; eager?: boolean; details?: boolean; owned?: Owned; ownedUid?: string; locked?: boolean };

export function ItemCard({ item, value, selected, onClick, chance, className = "", eager, details = true, owned, ownedUid, locked }: Props) {
  const { showItem } = useStore();
  const color = rarityColor(item.rarity);
  const price = value !== undefined ? rub(value) : rubF(item.price);
  const title = item.finish ? item.name.split(' | ')[0] : item.name;
  const sub = item.finish || (item.type === 'bonus' ? 'Бонус' : '');
  return (
    <div
      className={`item${onClick ? ' click' : ''}${selected ? ' sel' : ''} ${className}`}
      style={{ ['--rc' as string]: color }}
    >
    <div className="item-select" onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      title={item.name}
      aria-pressed={onClick ? !!selected : undefined}
    >
      {selected && <span className="tick">✓</span>}
      {chance !== undefined && <span className="chance">{pct(chance * 100)}</span>}
      <SkinImage item={item} eager={eager} />
      <div className="n"><b>{title}</b>{sub && <span>{sub}</span>}</div>
      <div className="p">{price}</div>
    </div>
      {locked && <span className="protected-mark">Защищён</span>}
      {details && <button className="item-details-btn" onClick={() => showItem(item.id, owned?.uid ?? ownedUid)} aria-label={'Подробнее: ' + item.name}>Подробнее ↗</button>}
      {owned && <OwnedActions owned={owned} />}
    </div>
  );
}
