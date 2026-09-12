import { albums } from '@/lib/catalog';
import { Albums } from '@/components/Albums';
export const metadata = { title: 'Коллекции — Your Drop' };
export default function CollectionsPage() { return <Albums albums={albums} />; }
