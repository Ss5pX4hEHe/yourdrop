import type { Metadata } from 'next';
import { Contract } from '@/components/Contract';
export const metadata: Metadata = { title: 'Контракт — Your Drop' };
export default function ContractPage() {
  return (
    <>
      <h1>Контракт</h1>
      <p className="lead">Выберите от 3 до 10 предметов. Взамен вы получите один случайный предмет стоимостью от 50% до 150% суммы контракта.</p>
      <Contract />
    </>
  );
}
