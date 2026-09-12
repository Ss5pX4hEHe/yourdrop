import type { Metadata } from 'next';
import './globals.css';
import './design.css';
import './collection.css';
import './atmosphere.css';
import './features.css';
import { StoreProvider } from '@/components/Store';
import { Header } from '@/components/Header';
import { AmbientBackground } from '@/components/AmbientBackground';

export const metadata: Metadata = {
  title: 'Your Drop — открытие кейсов CS2, апгрейд и контракты',
  description: 'Симулятор открытия кейсов CS2 с реальными скинами и ценами. Виртуальный баланс, апгрейд, контракты, инвентарь.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AmbientBackground />
        <StoreProvider>
          <Header />
          <main className="wrap page">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
