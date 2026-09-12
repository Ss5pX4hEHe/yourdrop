'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [['/profile', 'Инвентарь'], ['/profile/stats', 'Статистика'], ['/profile/collections', 'Коллекции'], ['/profile/routes', 'Маршруты'], ['/profile/achievements', 'Достижения'], ['/profile/showcase', 'Витрина'], ['/profile/devices', 'Устройства']];
export function ProfileNav() { const path = usePathname(); return <nav className="profile-nav" aria-label="Моя коллекция">{links.map(([href, label]) => <Link key={href} href={href} className={path === href ? 'active' : ''} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</nav>; }
