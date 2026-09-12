import Link from 'next/link';
export default function NotFound() {
  return <div className="empty">Такой страницы нет. <Link href="/">Вернуться к кейсам</Link></div>;
}
