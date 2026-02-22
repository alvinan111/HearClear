import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: '📊 Dashboard', exact: true },
  { href: '/users', label: '👥 用户管理' },
  { href: '/orders', label: '💳 订单管理' },
  { href: '/feedback', label: '💬 用户反馈' },
  { href: '/push', label: '🔔 推送通知' },
  { href: '/banners', label: '🖼️ 内容管理' },
  { href: '/config', label: '⚙️ 远程配置' },
  { href: '/versions', label: '📦 版本管理' },
  { href: '/analytics', label: '📈 数据统计' },
  { href: '/logs', label: '📋 操作日志' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600">👂 HearClear 后台</span>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 mb-1 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          HearClear Admin v1.0.0
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
