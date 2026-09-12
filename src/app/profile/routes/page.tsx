import { routes } from '@/lib/catalog';
import { Routes } from '@/components/Routes';
export const metadata = { title: 'Маршруты — Your Drop' };
export default function RoutesPage() { return <Routes routes={routes} />; }
