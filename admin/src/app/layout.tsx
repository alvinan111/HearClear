import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HearClear 管理后台',
  description: 'AI助听器运营管理系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-[#0a0a0c] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
