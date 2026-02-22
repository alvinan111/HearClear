'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  paidUsers: number;
  todayRevenueCents: number;
  pendingFeedbacks: number;
}

const QUICK = [
  { label: '授予会员', href: '/users',    color: 'bg-violet-500', icon: '👑' },
  { label: '发布公告', href: '/config',   color: 'bg-indigo-500', icon: '📢' },
  { label: '推送通知', href: '/push',     color: 'bg-sky-500',    icon: '🔔' },
  { label: '版本更新', href: '/versions', color: 'bg-emerald-500',icon: '📦' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, paidUsers: 0, todayRevenueCents: 0, pendingFeedbacks: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [
        { count: totalUsers },
        { count: paidUsers },
        { data: todayPayments },
        { count: pendingFeedbacks },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('amount_cents').eq('status', 'paid').gte('paid_at', new Date().toISOString().split('T')[0]),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({
        totalUsers: totalUsers ?? 0,
        paidUsers: paidUsers ?? 0,
        todayRevenueCents: (todayPayments ?? []).reduce((s, p) => s + (p.amount_cents as number), 0),
        pendingFeedbacks: pendingFeedbacks ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: '总用户数',   value: stats.totalUsers.toLocaleString(),                   icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50',  trend: '+12%' },
    { label: '付费会员',   value: stats.paidUsers.toLocaleString(),                    icon: '⭐', color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+8%'  },
    { label: '今日收入',   value: `¥${(stats.todayRevenueCents / 100).toFixed(2)}`,    icon: '💰', color: 'text-amber-600',  bg: 'bg-amber-50',  trend: '+5%'  },
    { label: '待处理反馈', value: stats.pendingFeedbacks.toLocaleString(),             icon: '💬', color: 'text-red-600',    bg: 'bg-red-50',    trend: ''     },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">数据总览</h2>
        <p className="text-slate-500 text-sm mt-1">欢迎使用 HearClear 管理后台</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center text-xl`}>{c.icon}</div>
              {c.trend && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{c.trend}</span>}
            </div>
            <p className={`text-3xl font-bold ${c.color} mb-1`}>
              {loading ? <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" /> : c.value}
            </p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">快速操作</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK.map((q) => (
            <a key={q.href} href={q.href}
               className="group flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer">
              <div className={`w-10 h-10 ${q.color} rounded-xl flex items-center justify-center text-xl text-white shadow-lg group-hover:scale-110 transition-transform`}>{q.icon}</div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">{q.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* System info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">系统信息</h3>
          <dl className="space-y-3">
            {[
              ['应用名称', 'HearClear - AI 助听器'],
              ['后台版本', 'v1.0.0'],
              ['数据库', 'Supabase PostgreSQL'],
              ['部署平台', 'Vercel'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-sm p-6 text-white">
          <h3 className="text-sm font-semibold text-indigo-200 mb-4 uppercase tracking-wider">今日摘要</h3>
          <p className="text-4xl font-bold mb-1">{loading ? '—' : stats.paidUsers}</p>
          <p className="text-indigo-200 text-sm mb-6">活跃付费用户</p>
          <div className="flex gap-3">
            <a href="/users" className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 rounded-xl text-center transition-colors">查看用户</a>
            <a href="/analytics" className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 rounded-xl text-center transition-colors">详细统计</a>
          </div>
        </div>
      </div>
    </div>
  );
}
