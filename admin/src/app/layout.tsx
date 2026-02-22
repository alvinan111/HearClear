import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HearClear 管理后台',
  description: 'AI助听器运营管理系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
