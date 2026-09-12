import type { Metadata } from 'next';
import { Upgrader } from '@/components/Upgrader';
export const metadata: Metadata = { title: 'Апгрейд — Your Drop' };
export default function UpgradePage() {
  return (
    <>
      <h1>Апгрейд</h1>
      <p className="lead">Поставьте предметы или сумму с баланса. Найдите цель по цене либо задайте шанс ползунком — подходящие предметы подберутся автоматически. Максимальный шанс — 75%. При неудаче ставка сгорает.</p>
      <Upgrader />
    </>
  );
}
