'use client';
import { useState } from 'react';
import type { Item } from '@/lib/types';

export function SkinImage({ item, eager = false }: { item: Item; eager?: boolean }) {
  const [failed, setFailed] = useState('');
  return item.image && failed !== item.image
    ? <img src={item.image} alt="" loading={eager ? 'eager' : 'lazy'} draggable={false} onError={() => setFailed(item.image)} />
    : <div className="skin-placeholder" aria-label="Изображение недоступно"><span>{item.type === 'bonus' ? '₽' : 'CS2'}</span><small>{item.type === 'bonus' ? 'Бонус' : 'Нет изображения'}</small></div>;
}
