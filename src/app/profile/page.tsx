import type { Metadata } from 'next';
import { Inventory } from '@/components/Inventory';
export const metadata: Metadata = { title: 'Инвентарь — Your Drop' };
export default function ProfilePage() { return <Inventory />; }
