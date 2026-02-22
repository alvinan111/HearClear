'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  paidUsers: number;
  todayRevenueCents: number;
  pendingFeedbacks: number;
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-100 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
          实时
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    paidUsers: 0,
    todayRevenueCents: 0,
    pendingFeedbacks: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: totalUsers },
        { count: paidUsers },
        { data: todayPayments },
        { count: pendingFeedbacks },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('payments')
          .select('amount_cents')
          .eq('status', 'paid')
          .gte('paid_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      const todayRevenueCents = (todayPayments ?? []).reduce(
        (sum, p) => sum + (p.amount_cents as number),
        0
      );

      setStats({
        totalUsers: totalUsers ?? 0,
        paidUsers: paidUsers ?? 0,
        todayRevenueCents,
        pendingFeedbacks: pendingFeedbacks ?? 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">数据总览</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="总用户数"
          value={stats.totalUsers.toLocaleString()}
          icon="👥"
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="活跃付费会员"
          value={stats.paidUsers.toLocaleString()}
          icon="⭐"
          color="bg-green-100 text-green-700"
        />
        <StatCard
          title="今日收入"
          value={`¥${(stats.todayRevenueCents / 100).toFixed(2)}`}
          icon="💰"
          color="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          title="待处理反馈"
          value={stats.pendingFeedbacks}
          icon="💬"
          color="bg-red-100 text-red-700"
        />
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '授予会员', href: '/users', icon: '👑' },
            { label: '发布公告', href: '/config', icon: '📢' },
            { label: '推送通知', href: '/push', icon: '🔔' },
            { label: '版本更新', href: '/versions', icon: '📦' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-gray-200 hover:border-blue-200"
            >
              <span className="text-2xl mb-2">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
